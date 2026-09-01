import { payoutType, strikesForUtilsPayout } from '../thetanuts/strikes.js';
import { fromUsdc, strikeToChain, toSize, utils } from '../thetanuts/decimals.js';
import type { Structure } from '../types/policy.js';

export function bagPayoffSeries(opts: {
  spot: number;
  protectedAmount: number;
  structure: Structure;
  strikesUsd: number[];
  numContractsHuman: string;
  premiumUsd: number;
  steps?: number;
}): { price: string; bagAloneUsd: string; bagPlusPolicyUsd: string }[] {
  const steps = opts.steps ?? 40;
  const u = utils();
  const strikes = strikesForUtilsPayout(
    opts.structure,
    opts.strikesUsd.map((s) => strikeToChain(s)),
  );
  const n = toSize(opts.numContractsHuman);
  const type = payoutType(opts.structure);
  const out = [];
  for (let i = 0; i <= steps; i++) {
    const price = opts.spot * (0.6 + (0.6 * i) / steps);
    const bagAlone = price * opts.protectedAmount;
    const payout = u.calculatePayout({
      type,
      strikes,
      settlementPrice: strikeToChain(price),
      numContracts: n,
    });
    const optionUsd = Number(fromUsdc(payout));
    const bagPlus = bagAlone + optionUsd - opts.premiumUsd;
    out.push({
      price: price.toFixed(2),
      bagAloneUsd: bagAlone.toFixed(2),
      bagPlusPolicyUsd: bagPlus.toFixed(2),
    });
  }
  return out;
}

export function maxPayoutUsd(opts: {
  structure: Structure;
  strikesUsd: number[];
  numContractsHuman: string;
}): string {
  const u = utils();
  const strikes = strikesForUtilsPayout(
    opts.structure,
    opts.strikesUsd.map((s) => strikeToChain(s)),
  );
  const fullyItm = Math.min(...opts.strikesUsd) * 0.01;
  const payout = u.calculatePayout({
    type: payoutType(opts.structure),
    strikes,
    settlementPrice: strikeToChain(Math.max(fullyItm, 1)),
    numContracts: toSize(opts.numContractsHuman),
  });
  return fromUsdc(payout);
}
