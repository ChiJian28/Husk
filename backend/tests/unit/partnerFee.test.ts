import { describe, expect, it } from 'vitest';
import { computePartnerFee } from '../../src/broker/partnerFee.js';

describe('computePartnerFee', () => {
  it('matches Polynuts vector: 10 USDC, 5c price, 10 bps → 10000 ($0.01)', () => {
    const usdcAmount = 10_000000n;
    const price = 5_000_000n;
    const fee = computePartnerFee(usdcAmount, price, 10n);
    expect(fee).toBe(10_000n);
  });
});
