import { DECIMALS } from '@thetanuts-finance/thetanuts-client';
import { getReadClient, getUtilsClient } from './client.js';

export { DECIMALS };

export const SIZE_DECIMALS = DECIMALS.OPTION_SIZE;

export function utils() {
  try {
    return getReadClient().utils;
  } catch {
    return getUtilsClient().utils;
  }
}

export function toSize(human: string | number): bigint {
  return utils().toBigInt(String(human), SIZE_DECIMALS);
}

export function fromSize(v: bigint): string {
  return utils().fromBigInt(v, SIZE_DECIMALS);
}

/** OptionBook preview.numContracts is 6-dec (USDC collateral convention). */
export function bookContractsToSize(previewNumContracts: bigint): bigint {
  return utils().scaleDecimals(previewNumContracts, DECIMALS.USDC, SIZE_DECIMALS);
}

export function fromUsdc(v: bigint): string {
  return utils().fromUsdcDecimals(v);
}

export function toUsdc(human: string | number): bigint {
  return utils().toUsdcDecimals(String(human));
}

export function strikeToChain(usd: number): bigint {
  return utils().strikeToChain(usd);
}

export function strikeFromChain(v: bigint): number {
  return utils().strikeFromChain(v);
}
