import { describe, expect, it } from 'vitest';
import { guardUtterance } from '../../src/agent/guardrails.js';

describe('guardrails', () => {
  it('refuses ape calls', () => {
    expect(guardUtterance('buy ETH calls')).toBeTruthy();
    expect(guardUtterance('ape calls for max profit')).toBeTruthy();
  });
  it('allows cover through CPI', () => {
    expect(guardUtterance('Cover my ETH through Friday CPI, max 3 USDC')).toBeUndefined();
  });
});
