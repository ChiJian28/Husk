import { describe, expect, it } from 'vitest';
import { strikeToChain } from '../../src/thetanuts/decimals.js';
import { strikesUsdFromChain } from '../../src/underwriter/bookStrikes.js';
import { encodeBlockedReason } from '../../src/execution/guard.js';
import type { PolicyQuote } from '../../src/types/policy.js';

function fakeQuote(warnings: string[], allowStack = false): PolicyQuote {
  return {
    warnings,
    intent: {
      wallet: '0x078c418ded28f40bb7f5c88170440fece54ced1a',
      asset: 'ETH',
      maxDrawdownPct: 10,
      coverageFraction: 1,
      maxPremiumUsdc: 1,
      allowStack,
    },
    existingCoverageId: 'cov-1',
  } as unknown as PolicyQuote;
}

describe('book order strikes drive payoff', () => {
  it('sorts a descending on-chain PUT_SPREAD to [lower, upper] USD', () => {
    const usd = strikesUsdFromChain('PUT_SPREAD', [strikeToChain(2250), strikeToChain(2150)]);
    expect(usd).toEqual([2150, 2250]);
  });

  it('uses the listed PUT strike, not a leftover lower tick', () => {
    const usd = strikesUsdFromChain('PUT', [strikeToChain(2100), strikeToChain(2250)]);
    expect(usd).toEqual([2250]);
  });
});

describe('encode guard', () => {
  it('blocks a second plan when ALREADY_COVERED unless allowStack', () => {
    expect(encodeBlockedReason(fakeQuote(['ALREADY_COVERED']))).toBe('ALREADY_COVERED');
    expect(encodeBlockedReason(fakeQuote(['ALREADY_COVERED'], true))).toBeUndefined();
  });

  it('blocks a second RFQ request when OPEN_RFQ_EXISTS', () => {
    expect(encodeBlockedReason(fakeQuote(['OPEN_RFQ_EXISTS']))).toBe('OPEN_RFQ_EXISTS');
  });
});
