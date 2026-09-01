import type { Asset, RfqBuildSnapshot, Structure } from '../types/policy.js';
import { env } from '../config.js';

export function buildRfqSnapshot(opts: {
  wallet: `0x${string}`;
  asset: Asset;
  structure: Structure;
  kLo: number;
  kHi: number;
  expiryUnix: number;
  numContractsHuman: number;
  reservePricePerContract: number;
}): RfqBuildSnapshot {
  const referral = env.RFQ_REFERRAL_ID?.trim();
  return {
    underlying: opts.asset,
    optionType: 'PUT',
    lowerStrike: opts.structure === 'PUT_SPREAD' ? opts.kLo : opts.kHi,
    upperStrike: opts.kHi,
    strike: opts.kHi,
    expiry: opts.expiryUnix,
    numContracts: opts.numContractsHuman,
    isLong: true,
    offerDeadlineMinutes: 15,
    collateralToken: 'USDC',
    reservePrice: opts.reservePricePerContract,
    referralId: referral || undefined,
  };
}
