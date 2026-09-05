import { describe, expect, it } from 'vitest';
import { bagPayoffSeries, maxPayoutUsd } from '../../src/underwriter/bagPayoff.js';
import { stressPayoffFromQuote, stressPointAtDrawdown } from '../../src/underwriter/stressPayoff.js';
import { sizePutSpreadStrikes } from '../../src/underwriter/sizePutSpread.js';
import { assertDebitIsMaxLoss } from '../../src/underwriter/invariants.js';
import { policyUserSentence } from '../../src/underwriter/copy.js';

describe('underwriter math', () => {
  it('throws when maxLoss drifts from debit', () => {
    expect(() => assertDebitIsMaxLoss({ totalDebitUsdc: '3.000000', maxLossUsdc: '2.000000' })).toThrow(
      /maxLossUsdc/,
    );
    expect(() => assertDebitIsMaxLoss({ totalDebitUsdc: '3.000000', maxLossUsdc: '3.000000' })).not.toThrow();
  });

  it('explain fallback template includes debit and max payout verbatim', () => {
    const text = policyUserSentence({
      event: { name: 'CPI (Consumer Price Index)' },
      totalDebitUsdc: '1.000000',
      maxPayoutUsdc: '0.201277',
      expiryIso: '2026-09-12T08:00:00.000Z',
    });
    expect(text).toContain('1.000000');
    expect(text).toContain('0.201277');
    expect(text).toContain('Chainlink TWAP');
  });

  it('sizes a 10% deductible put spread off spot', () => {
    const s = sizePutSpreadStrikes(2500, 10, 'ETH');
    expect(s).not.toBeNull();
    expect(s!.kHi).toBe(2250);
    expect(s!.widthUsd).toBeGreaterThanOrEqual(50);
    expect(s!.kLo).toBe(s!.kHi - s!.widthUsd);
  });

  it('bag payoff series is nonempty and ITM max payout ≈ width', () => {
    const series = bagPayoffSeries({
      spot: 2500,
      protectedAmount: 1,
      structure: 'PUT_SPREAD',
      strikesUsd: [2125, 2250],
      numContractsHuman: '1',
      premiumUsd: 3,
      steps: 10,
    });
    expect(series.length).toBe(11);
    const maxP = Number(maxPayoutUsd({ structure: 'PUT_SPREAD', strikesUsd: [2125, 2250], numContractsHuman: '1' }));
    expect(maxP).toBeGreaterThan(100);
    expect(maxP).toBeLessThan(150);
  });

  it('stress payoff sweeps drawdown from 0 to -50%', () => {
    const quote = {
      id: 'q1',
      spot: { source: 'test', price: 2500, asOf: '2026-01-01T00:00:00.000Z' },
      bag: { protectedNotionalAsset: '1' },
      structure: 'PUT_SPREAD' as const,
      strikesUsd: [2125, 2250],
      numContractsHuman: '1',
      totalDebitUsdc: '3.000000',
      deductiblePct: 10,
      intent: { asset: 'ETH' as const },
      maxPayoutUsdc: '125',
    };
    const series = stressPayoffFromQuote(quote as never, { minDrawdownPct: -50, maxDrawdownPct: 0, steps: 10 });
    expect(series.length).toBe(11);
    expect(series[0]!.drawdownPct).toBe(-50);
    expect(series.at(-1)!.drawdownPct).toBe(0);
    expect(Number(series.at(-1)!.bagAloneUsd)).toBeGreaterThan(Number(series[0]!.bagAloneUsd));

    const at = stressPointAtDrawdown(quote as never, -35);
    expect(at.drawdownPct).toBe(-35);
    expect(Number(at.priceUsd)).toBeCloseTo(2500 * 0.65, 0);
  });
});
