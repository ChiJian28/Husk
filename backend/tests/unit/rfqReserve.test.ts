import { describe, expect, it } from 'vitest';
import { offerWithinReserve, pickFirstOfferWithinReserve } from '../../src/rfq/reserve.js';

describe('RFQ offer vs reserve', () => {
  const reserve = 1_000_000n;

  it('accepts an offer at or under reserve', () => {
    expect(offerWithinReserve(1_000_000n, reserve)).toBe(true);
    expect(offerWithinReserve(999_999n, reserve)).toBe(true);
  });

  it('rejects an offer above reserve', () => {
    expect(offerWithinReserve(1_000_001n, reserve)).toBe(false);
  });

  it('skips over-budget makers and takes the first that fits', () => {
    const { accepted, rejected } = pickFirstOfferWithinReserve(
      [
        { offeror: '0xhi', offerAmount: 2_000_000n },
        { offeror: '0xok', offerAmount: 800_000n },
      ],
      reserve,
    );
    expect(accepted?.offeror).toBe('0xok');
    expect(rejected).toHaveLength(1);
  });
});
