import { randomUUID } from 'node:crypto';
import { ZeroAddress } from 'ethers';
import { env } from '../config.js';
import { logger } from '../logger.js';
import { getById, getShelf, syntheticCustomWindow } from '../calendar/service.js';
import { pickUpcomingEvent } from '../calendar/pick.js';
import { getHoldings } from '../holdings/service.js';
import { settlementGrid } from '../expiry/settlementGrid.js';
import { chooseExpiryUnix, eventInstant } from '../expiry/spanEvent.js';
import { getProvider, getReadClient } from '../thetanuts/client.js';
import { fromUsdc, strikeToChain, toSize, toUsdc } from '../thetanuts/decimals.js';
import { chooseRoute } from '../router/choose.js';
import { computePartnerFee, readBrokerFeeBps } from '../broker/partnerFee.js';
import { HuskError } from '../errors.js';
import { persistQuote, findOpenRfq, getQuoteRow } from '../coverage/repo.js';
import { listActiveCoverages } from '../coverage/service.js';
import type {
  BookOrderRef,
  CalendarEvent,
  CoverageIntent,
  PolicyQuote,
  Structure,
} from '../types/policy.js';
import { policyUserSentence } from './copy.js';
import { assertDebitIsMaxLoss } from './invariants.js';
import { strikesUsdFromChain } from './bookStrikes.js';
import { bagPayoffSeries, maxPayoutUsd } from './bagPayoff.js';
import { sizePutSpreadStrikes } from './sizePutSpread.js';
import { vanillaPutFallbackReason } from './vanillaPutFallback.js';

async function resolveEvent(intent: CoverageIntent): Promise<CalendarEvent> {
  if (intent.eventId) return getById(intent.eventId);
  if (intent.customWindowEndUtc) {
    return syntheticCustomWindow(intent.customWindowEndUtc, intent.wallet);
  }
  const shelf = await getShelf();
  const upcoming = pickUpcomingEvent(shelf, intent.asset);
  if (!upcoming) {
    throw new Error('no upcoming event on the shelf; pass eventId or customWindowEndUtc');
  }
  return upcoming;
}

async function spotFor(asset: CoverageIntent['asset']): Promise<{
  price: number;
  source: string;
  asOf: string;
}> {
  const md = await getReadClient().api.getMarketData();
  const raw = asset === 'BTC' ? md.prices?.BTC : md.prices?.ETH;
  const price = typeof raw === 'number' ? raw : Number(raw);
  if (!Number.isFinite(price) || price <= 0) throw new Error('spot unavailable');
  return { price, source: 'thetanuts.api.getMarketData', asOf: new Date().toISOString() };
}

async function mmSpreadAskUsd(opts: {
  asset: CoverageIntent['asset'];
  kLo: number;
  kHi: number;
  expiryUnix: number;
  contractsHuman: number;
}): Promise<number | null> {
  try {
    const spread = await getReadClient().mmPricing.getSpreadPricing({
      underlying: opts.asset,
      strikes: [strikeToChain(opts.kHi), strikeToChain(opts.kLo)],
      expiry: opts.expiryUnix,
      isCall: false,
      numContracts: toSize(opts.contractsHuman),
    });
    const ask = spread.netMmAskPrice;
    const spot = (await spotFor(opts.asset)).price;
    if (!Number.isFinite(ask) || ask <= 0) return null;
    return ask * spot * opts.contractsHuman;
  } catch (e) {
    logger.debug({ err: e instanceof Error ? e.message : e }, 'getSpreadPricing skipped');
    return null;
  }
}

export async function quote(intent: CoverageIntent): Promise<PolicyQuote> {
  const warnings: string[] = [];
  const event = await resolveEvent(intent);
  if (event.stale) warnings.push(`Event feed snapshot expired (stale calendar).`);
  if (!event.assets.includes(intent.asset)) {
    warnings.push(`ASSET_EVENT_MISMATCH: event ${event.id} lists ${event.assets.join(',')} but intent is ${intent.asset}`);
  }

  const holdings = await getHoldings(intent.wallet);
  const protectedHuman =
    intent.asset === 'BTC'
      ? Number(holdings.cbbtcHuman) * intent.coverageFraction
      : Number(holdings.ethBagHuman) * intent.coverageFraction;

  let emptyBag = false;
  if (!Number.isFinite(protectedHuman) || protectedHuman <= 0) {
    emptyBag = true;
    warnings.push(`EMPTY_BAG_DEMO_SIZE: No ETH/BTC to protect; sizing a $${intent.maxPremiumUsdc} demo policy.`);
  }

  const active = await listActiveCoverages(intent.wallet, intent.asset);
  const { tEvent, reason: tReason } = eventInstant(event);
  const tEventUnix = Math.floor(tEvent.getTime() / 1000);
  const grid = await settlementGrid();
  const cryptoBucket = event.category === 'crypto_expiry';
  const { expiryUnix, expiryReason } = chooseExpiryUnix({ tEventUnix, grid, cryptoBucket });

  if (!intent.allowStack) {
    const openRfq = await findOpenRfq(intent.wallet, event.id, expiryUnix);
    if (openRfq) {
      if (openRfq.quote_id) {
        const existing = await getQuoteRow(openRfq.quote_id as string);
        if (existing) {
          const reused = existing.quote;
          if (!reused.warnings.includes('OPEN_RFQ_EXISTS')) {
            reused.warnings.push('OPEN_RFQ_EXISTS');
          }
          reused.existingCoverageId = openRfq.id as string;
          await persistQuote(reused, 'rfq_open');
          return reused;
        }
      }
      throw new HuskError(
        'OPEN_RFQ_EXISTS',
        `open RFQ ${openRfq.id} — use POST /v1/coverages/${openRfq.id}/settle-plan, do not encode a second request`,
        409,
      );
    }
  }

  const overlapping = active.filter((c) => Number(c.expiry_unix) >= expiryUnix);
  if (overlapping.length && !intent.allowStack) {
    warnings.push(`ALREADY_COVERED`);
  }

  const spot = await spotFor(intent.asset);
  const spread = sizePutSpreadStrikes(spot.price, intent.maxDrawdownPct, intent.asset);
  const vanillaReason = vanillaPutFallbackReason({
    spread,
    preference: intent.structurePreference,
  });
  const structure: Structure = vanillaReason ? 'PUT' : 'PUT_SPREAD';
  if (vanillaReason) warnings.push(vanillaReason);

  const kHi = spread?.kHi ?? Math.round(spot.price * (1 - intent.maxDrawdownPct / 100));
  const kLo = spread?.kLo ?? 0;
  const widthUsd = spread?.widthUsd ?? kHi;

  let contractsHuman = emptyBag ? 0.01 : Math.max(protectedHuman, 0.001);
  const budget = intent.maxPremiumUsdc;

  let premiumEst = await mmSpreadAskUsd({
    asset: intent.asset,
    kLo: structure === 'PUT_SPREAD' ? kLo : kHi * 0.95,
    kHi,
    expiryUnix,
    contractsHuman,
  });
  if (premiumEst != null && premiumEst > budget && premiumEst > 0) {
    contractsHuman = contractsHuman * (budget / premiumEst);
    premiumEst = budget;
  }
  if (premiumEst == null) {
    premiumEst = budget;
  }

  const usdcBudget = toUsdc(Math.min(budget, Math.max(premiumEst, 0.01)).toFixed(6));
  const targetStrikes = structure === 'PUT_SPREAD' ? [kLo, kHi] : [kHi];
  const reservePer = contractsHuman > 0 ? budget / contractsHuman : budget;

  const decision = await chooseRoute({
    wallet: intent.wallet,
    asset: intent.asset,
    structure,
    expiryUnix,
    tEventUnix,
    cryptoBucket,
    kLo,
    kHi,
    targetStrikesUsd: targetStrikes,
    numContractsHuman: contractsHuman,
    usdcBudget,
    reservePerContract: reservePer,
  });

  let premiumUsdc = premiumEst.toFixed(6);
  let brokerFeeUsdc = '0';
  let numContractsHuman = contractsHuman.toFixed(8);
  let numContractsChain = toSize(numContractsHuman).toString();
  let bookOrderRef: BookOrderRef | undefined;
  const dryRun: Record<string, unknown> = {
    matchedBook: decision.matchedBook,
    reason: decision.reason,
    tEvent: tEvent.toISOString(),
    tReason,
    singleMaker: true,
  };

  if (decision.book) {
    const p = decision.book.preview;
    premiumUsdc = fromUsdc(p.totalCollateral);
    numContractsHuman = (Number(p.numContracts) / 1e6).toString();
    numContractsChain = toSize(numContractsHuman).toString();
    dryRun.preview = {
      numContracts: p.numContracts.toString(),
      totalCollateral: p.totalCollateral.toString(),
      pricePerContract: p.pricePerContract.toString(),
    };
    const impl = decision.book.order.rawApiData?.implementation ?? '';
    bookOrderRef = {
      nonce: decision.book.order.order.nonce.toString(),
      maker: decision.book.order.order.maker,
      expiry: Number(decision.book.order.order.expiry),
      implementation: impl,
      implName: decision.book.implName,
      strikes: (decision.book.order.order.strikes ?? []).map((s) => s.toString()),
      price: decision.book.order.order.price.toString(),
      availableAmount: decision.book.order.availableAmount.toString(),
    };
    if (env.partnerBrokerAddress) {
      try {
        const bps = await readBrokerFeeBps(getProvider(), env.partnerBrokerAddress);
        const fee = computePartnerFee(p.totalCollateral, decision.book.order.order.price, bps);
        brokerFeeUsdc = fromUsdc(fee);
        dryRun.brokerBps = bps.toString();
        warnings.push(
          `Includes ${(Number(bps) / 100).toFixed(2)}% partner fee (${bps.toString()} bps) on premium. You can refuse and we will not route.`,
        );
      } catch (e) {
        warnings.push('BOOK_PATH_EARNS_ZERO: broker feeBps() unread');
        logger.warn({ err: e instanceof Error ? e.message : e }, 'broker fee read failed');
      }
    } else {
      warnings.push('BOOK_PATH_EARNS_ZERO');
    }
  } else {
    warnings.push(
      'Custom expiry. A market maker must answer. We wait up to 15 minutes and can lock the first good offer.',
    );
    warnings.push('RFQ premium is a USDC reserve cap, not a filled price. The maker may offer less.');
    dryRun.rfq = decision.rfq;
  }

  const premiumNum = Number(premiumUsdc);
  const feeNum = Number(brokerFeeUsdc);
  const totalDebit = (premiumNum + feeNum).toFixed(6);
  let strikesUsd = structure === 'PUT_SPREAD' ? [kLo, kHi] : [kHi];
  if (decision.book) {
    const raw = (decision.book.order.order.strikes ?? []).map((s) => BigInt(s));
    const fromOrder = strikesUsdFromChain(structure, raw);
    if (fromOrder.length > 0) {
      if (fromOrder.length !== strikesUsd.length || fromOrder.some((s, i) => s !== strikesUsd[i])) {
        warnings.push('BOOK_STRIKES_FROM_ORDER: payoff uses the matched book ticks, not the underwriter target.');
      }
      strikesUsd = fromOrder;
    }
  }
  const strikesChain = strikesUsd.map((s) => strikeToChain(s).toString());
  const maxPayout = maxPayoutUsd({
    structure,
    strikesUsd,
    numContractsHuman,
  });
  const protectedAmt = emptyBag ? contractsHuman : protectedHuman;
  const payoff = bagPayoffSeries({
    spot: spot.price,
    protectedAmount: protectedAmt,
    structure,
    strikesUsd,
    numContractsHuman,
    premiumUsd: Number(totalDebit),
  });

  if (decision.route === 'RFQ') {
    dryRun.reservePricePerContract = reservePer;
    dryRun.approveFactory = env.encodeOnly ? ZeroAddress : getReadClient().chainConfig.contracts.optionFactory;
  }

  const quote: PolicyQuote = {
    id: randomUUID(),
    intent,
    event,
    spot,
    bag: {
      eth: holdings.ethHuman,
      weth: holdings.wethHuman,
      cbbtc: holdings.cbbtcHuman,
      usdc: holdings.usdcHuman,
      protectedNotionalAsset: emptyBag ? String(contractsHuman) : String(protectedHuman),
    },
    structure,
    strikesUsd,
    strikesChain,
    expiryUnix,
    expiryIso: new Date(expiryUnix * 1000).toISOString(),
    expiryReason,
    numContractsHuman,
    numContractsChain,
    premiumUsdc,
    brokerFeeUsdc,
    totalDebitUsdc: totalDebit,
    deductiblePct: intent.maxDrawdownPct,
    maxPayoutUsdc: maxPayout,
    maxLossUsdc: totalDebit,
    route: decision.route,
    bookOrderRef,
    rfqRequest: decision.rfq,
    payoff,
    dryRun,
    warnings,
    copy: {
      userSentence: '',
      settlement: 'Chainlink TWAP',
    },
    createdAt: new Date().toISOString(),
    existingCoverageId: overlapping[0]?.id as string | undefined,
  };
  quote.copy.userSentence = policyUserSentence(quote);
  assertDebitIsMaxLoss(quote);

  await persistQuote(quote, 'quoted');
  return quote;
}
