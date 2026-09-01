/**
 * Strike order is a contract invariant.
 *
 * client.utils.calculatePayout put_spread: [lower, upper] ASCENDING
 * client.option.simulatePayout PUT / PUT_SPREAD / PUT_FLY: DESCENDING
 * Passing the wrong order silently returns 0.
 */
export type PutFamily = 'PUT' | 'PUT_SPREAD' | 'PUT_FLY';

export function isPutNonCondor(implName: string): boolean {
  return implName === 'PUT' || implName === 'PUT_SPREAD' || implName === 'PUT_FLY';
}

export function sortAscending(strikes: bigint[]): bigint[] {
  return [...strikes].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
}

export function sortDescending(strikes: bigint[]): bigint[] {
  return [...strikes].sort((a, b) => (a > b ? -1 : a < b ? 1 : 0));
}

/** Order for client.utils.calculatePayout / generate bag series. */
export function strikesForUtilsPayout(implName: string, raw: bigint[]): bigint[] {
  if (implName === 'PUT_SPREAD' || implName === 'put_spread') return sortAscending(raw);
  if (isPutNonCondor(implName)) return sortDescending(raw);
  return sortAscending(raw);
}

/** Order for client.option.simulatePayout on-chain. */
export function strikesForOnChainSimulate(implName: string, raw: bigint[]): bigint[] {
  if (isPutNonCondor(implName)) return sortDescending(raw);
  return sortAscending(raw);
}

export function payoutType(structure: 'PUT_SPREAD' | 'PUT'): 'put_spread' | 'put' {
  return structure === 'PUT_SPREAD' ? 'put_spread' : 'put';
}
