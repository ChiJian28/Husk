import { strikeFromChain } from '../thetanuts/decimals.js';
import type { Structure } from '../types/policy.js';

/** Book order strikes are on-chain 8-dec. Payoff must use these, not the underwriter's target ticks. */
export function strikesUsdFromChain(structure: Structure, chainStrikes: bigint[]): number[] {
  const usd = chainStrikes.map((s) => strikeFromChain(s));
  if (structure === 'PUT_SPREAD') return [...usd].sort((a, b) => a - b);
  if (usd.length === 0) return [];
  return [Math.max(...usd)];
}
