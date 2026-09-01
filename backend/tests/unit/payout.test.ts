import { describe, expect, it } from 'vitest';
import { DECIMALS } from '@thetanuts-finance/thetanuts-client';
import { getUtilsClient } from '../../src/thetanuts/client.js';
import { payoutType, strikesForOnChainSimulate, strikesForUtilsPayout } from '../../src/thetanuts/strikes.js';

describe('put spread payout + strike order', () => {
  const client = getUtilsClient();
  const kLo = client.utils.strikeToChain(2000);
  const kHi = client.utils.strikeToChain(2200);
  const n = client.utils.toBigInt('1', DECIMALS.OPTION_SIZE);

  it('utils put_spread [lower, upper] fully ITM ≈ width × contracts', () => {
    const strikes = strikesForUtilsPayout('PUT_SPREAD', [kHi, kLo]);
    expect(strikes[0]! < strikes[1]!).toBe(true);
    const payout = client.utils.calculatePayout({
      type: payoutType('PUT_SPREAD'),
      strikes,
      settlementPrice: client.utils.strikeToChain(1000),
      numContracts: n,
    });
    const usd = Number(client.utils.fromUsdcDecimals(payout));
    expect(usd).toBeGreaterThan(198);
    expect(usd).toBeLessThan(202);
  });

  it('utils put_spread OTM is 0', () => {
    const payout = client.utils.calculatePayout({
      type: 'put_spread',
      strikes: [kLo, kHi],
      settlementPrice: client.utils.strikeToChain(3000),
      numContracts: n,
    });
    expect(payout).toBe(0n);
  });

  it('on-chain simulate order for PUT_SPREAD is descending', () => {
    const desc = strikesForOnChainSimulate('PUT_SPREAD', [kLo, kHi]);
    expect(desc[0]!).toBe(kHi);
    expect(desc[1]!).toBe(kLo);
  });
});
