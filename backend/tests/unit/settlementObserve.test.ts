import { describe, expect, it } from 'vitest';
import { observeSettlement } from '../../src/jobs/settlementObserve.js';

describe('observeSettlement (r12)', () => {
  it('does not invent a payout() call while waiting on expiry', () => {
    const o = observeSettlement({ expired: false, settled: false, payoutUsdc: '0' });
    expect(o.action).toBe('wait_expiry');
    expect(o.status).toBe('active');
  });

  it('waits for factory notifyTradeSettled instead of encoding payout()', () => {
    const o = observeSettlement({ expired: true, settled: false, payoutUsdc: '12' });
    expect(o.action).toBe('wait_factory');
    expect(o.status).toBe('active');
    expect(o.note).toMatch(/notifyTradeSettled/);
  });

  it('records expired_paid only after on-chain settled + payout > 0', () => {
    const o = observeSettlement({ expired: true, settled: true, payoutUsdc: '12.5' });
    expect(o.action).toBe('record');
    expect(o.status).toBe('expired_paid');
  });

  it('records expired_unpaid when settled with zero payout', () => {
    const o = observeSettlement({ expired: true, settled: true, payoutUsdc: '0' });
    expect(o.status).toBe('expired_unpaid');
  });
});
