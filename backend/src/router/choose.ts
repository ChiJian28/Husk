import { env } from '../config.js';
import type { Asset, Route, RfqBuildSnapshot, Structure } from '../types/policy.js';
import { findBookMatch, type BookMatch } from './bookMatch.js';
import { buildRfqSnapshot } from './rfqBuild.js';

export type RouteDecision = {
  route: Route;
  matchedBook: boolean;
  reason: string;
  book?: BookMatch;
  rfq?: RfqBuildSnapshot;
};

export async function chooseRoute(opts: {
  wallet: `0x${string}`;
  asset: Asset;
  structure: Structure;
  expiryUnix: number;
  tEventUnix: number;
  cryptoBucket: boolean;
  kLo: number;
  kHi: number;
  targetStrikesUsd: number[];
  numContractsHuman: number;
  usdcBudget: bigint;
  reservePerContract: number;
}): Promise<RouteDecision> {
  if (!env.huskForceRfq) {
    const book = await findBookMatch({
      asset: opts.asset,
      structure: opts.structure,
      expiryUnix: opts.expiryUnix,
      tEventUnix: opts.tEventUnix,
      cryptoBucket: opts.cryptoBucket,
      targetStrikesUsd: opts.targetStrikesUsd,
      usdcBudget: opts.usdcBudget,
    });
    if (book) {
      return {
        route: 'OPTIONBOOK',
        matchedBook: true,
        reason: `book ${book.implName} expiry ${Number(book.order.order.expiry)} within window`,
        book,
      };
    }
  }
  const rfq = buildRfqSnapshot({
    wallet: opts.wallet,
    asset: opts.asset,
    structure: opts.structure,
    kLo: opts.kLo,
    kHi: opts.kHi,
    expiryUnix: opts.expiryUnix,
    numContractsHuman: opts.numContractsHuman,
    reservePricePerContract: opts.reservePerContract,
  });
  return {
    route: 'RFQ',
    matchedBook: false,
    reason: env.huskForceRfq
      ? 'HUSK_FORCE_RFQ=true (Track 02 demo path)'
      : 'no book order matched expiry/strikes/depth; RFQ for custom settlement',
    rfq,
  };
}
