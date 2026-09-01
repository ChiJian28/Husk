import { ZeroAddress } from 'ethers';
import { env } from '../config.js';
import { HuskError, NotFoundError } from '../errors.js';
import { computePartnerFee, readBrokerFeeBps } from '../broker/partnerFee.js';
import { getProvider, getReadClient } from '../thetanuts/client.js';
import { toUsdc } from '../thetanuts/decimals.js';
import { withWalletKeyContext } from '../rfq/keys.js';
import { assertCanEncode } from './guard.js';
import type { BookOrderRef, ExecutionPlan, PolicyQuote, RfqBuildSnapshot, UnsignedCall } from '../types/policy.js';

function asAddr(s: string): `0x${string}` {
  return s.toLowerCase() as `0x${string}`;
}

function requireContract(addr: string | null, name: string): `0x${string}` {
  if (!addr) throw new HuskError('NO_CONTRACT', `${name} not deployed on this chain`);
  return asAddr(addr);
}

async function reloadBookOrder(ref: BookOrderRef) {
  const orders = await getReadClient().api.fetchOrders();
  const hit = orders.find(
    (o) =>
      o.order.nonce.toString() === ref.nonce &&
      o.order.maker.toLowerCase() === ref.maker.toLowerCase(),
  );
  if (!hit) throw new NotFoundError('book order no longer on the book (stale quote)');
  return hit;
}

export async function buildExecutionPlan(quote: PolicyQuote): Promise<ExecutionPlan> {
  await assertCanEncode(quote);
  const client = getReadClient();
  const usdc = client.chainConfig.tokens.USDC.address;
  const calls: UnsignedCall[] = [];

  if (quote.route === 'OPTIONBOOK') {
    const ref = quote.bookOrderRef as BookOrderRef | undefined;
    if (!ref) throw new HuskError('NO_BOOK_REF', 'quote has no bookOrderRef');
    const order = await reloadBookOrder(ref);
    const premium = toUsdc(quote.premiumUsdc);
    let spender = requireContract(client.chainConfig.contracts.optionBook, 'optionBook');
    let approveAmt = premium;
    let fillTo = requireContract(client.chainConfig.contracts.optionBook, 'optionBook');
    let referrer: string = env.referrerAddress ?? ZeroAddress;

    if (env.partnerBrokerAddress) {
      const bps = await readBrokerFeeBps(getProvider(), env.partnerBrokerAddress);
      const fee = computePartnerFee(premium, order.order.price, bps);
      spender = asAddr(env.partnerBrokerAddress);
      approveAmt = premium + fee;
      fillTo = spender;
      referrer = ZeroAddress;
    }

    const allowance = await client.erc20.getAllowance(usdc, quote.intent.wallet, spender);
    if (allowance < approveAmt) {
      const appr = client.erc20.encodeApprove(usdc, spender, approveAmt);
      calls.push({
        to: asAddr(appr.to),
        data: appr.data as `0x${string}`,
        value: '0',
        description: `approve exact ${approveAmt.toString()} USDC to ${spender}`,
      });
    }
    const encoded = client.optionBook.encodeFillOrder(order, premium, referrer);
    calls.push({
      to: fillTo,
      data: encoded.data as `0x${string}`,
      value: '0',
      description: env.partnerBrokerAddress
        ? 'fill via PartnerFeeBroker (referrer = 0)'
        : 'fill OptionBook',
    });
    return {
      quoteId: quote.id,
      calls,
      spender,
      approveAmountUsdc: approveAmt.toString(),
    };
  }

  const snap = quote.rfqRequest as RfqBuildSnapshot | undefined;
  if (!snap) throw new HuskError('NO_RFQ', 'quote has no rfqRequest');

  const factory = requireContract(client.chainConfig.contracts.optionFactory, 'optionFactory');
  const reserveTotal = toUsdc((snap.reservePrice * snap.numContracts).toFixed(6));

  return withWalletKeyContext(quote.intent.wallet, async () => {
    const keyPair = await client.rfqKeys.getOrCreateKeyPair();
    const referralId = snap.referralId ? BigInt(snap.referralId) : 0n;
    const request =
      quote.structure === 'PUT_SPREAD'
        ? client.optionFactory.buildSpreadRFQ({
            requester: quote.intent.wallet,
            underlying: snap.underlying,
            optionType: 'PUT',
            lowerStrike: snap.lowerStrike,
            upperStrike: snap.upperStrike,
            expiry: snap.expiry,
            numContracts: snap.numContracts,
            isLong: true,
            offerDeadlineMinutes: snap.offerDeadlineMinutes,
            collateralToken: 'USDC',
            reservePrice: snap.reservePrice,
            referralId,
            requesterPublicKey: keyPair.compressedPublicKey,
          })
        : client.optionFactory.buildRFQRequest({
            requester: quote.intent.wallet,
            underlying: snap.underlying,
            optionType: 'PUT',
            strikes: [snap.strike],
            expiry: snap.expiry,
            numContracts: snap.numContracts,
            isLong: true,
            offerDeadlineMinutes: snap.offerDeadlineMinutes,
            collateralToken: 'USDC',
            reservePrice: snap.reservePrice,
            referralId,
            requesterPublicKey: keyPair.compressedPublicKey,
          });

    const allowance = await client.erc20.getAllowance(usdc, quote.intent.wallet, factory);
    if (allowance < reserveTotal) {
      const appr = client.erc20.encodeApprove(usdc, factory, reserveTotal);
      calls.push({
        to: asAddr(appr.to),
        data: appr.data as `0x${string}`,
        value: '0',
        description: `approve exact ${reserveTotal.toString()} USDC to OptionFactory (RFQ reserve escrow)`,
      });
    }
    const { to, data } = client.optionFactory.encodeRequestForQuotation(request);
    calls.push({
      to: asAddr(to),
      data: data as `0x${string}`,
      value: '0',
      description: 'requestForQuotation (custom expiry put/put-spread)',
    });
    return {
      quoteId: quote.id,
      calls,
      spender: factory,
      approveAmountUsdc: reserveTotal.toString(),
    };
  });
}
