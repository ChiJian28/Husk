export type SettlementObservation = {
  action: 'wait_expiry' | 'wait_factory' | 'record';
  status: 'active' | 'expired_paid' | 'expired_unpaid';
  note: string;
};

/**
 * r12 BaseOption has no user-callable payout(). Settlement is the factory
 * `notifyTradeSettled` callback. The keeper only observes.
 */
export function observeSettlement(opts: {
  expired: boolean;
  settled: boolean;
  payoutUsdc: string;
}): SettlementObservation {
  if (!opts.expired) {
    return {
      action: 'wait_expiry',
      status: 'active',
      note: 'option not expired on-chain yet',
    };
  }
  if (!opts.settled) {
    return {
      action: 'wait_factory',
      status: 'active',
      note: 'expired; waiting for factory notifyTradeSettled (no user-callable payout on r12)',
    };
  }
  const paid = Number(opts.payoutUsdc) > 0;
  return {
    action: 'record',
    status: paid ? 'expired_paid' : 'expired_unpaid',
    note: paid ? 'settled ITM' : 'settled OTM / zero payout',
  };
}
