import { describe, expect, it } from 'vitest';
import { inferNamedEvent, pickUpcomingEvent } from '../../src/calendar/pick.js';
import type { CalendarEvent } from '../../src/types/policy.js';

const now = Date.parse('2026-09-01T05:00:00.000Z');

function ev(partial: Partial<CalendarEvent> & Pick<CalendarEvent, 'id' | 'name' | 'category' | 'tsUtc' | 'assets'>): CalendarEvent {
  return {
    source: 'thetanuts_calendar',
    importance: 'high',
    tsPrecision: 'date_only',
    stale: false,
    ...partial,
  };
}

const shelf: CalendarEvent[] = [
  ev({
    id: 'deribit:BTC:2026-09-01',
    name: 'BTC Deribit expiry',
    category: 'crypto_expiry',
    tsUtc: '2026-09-01T08:00:00.000Z',
    assets: ['BTC'],
    tsPrecision: 'datetime',
  }),
  ev({
    id: 'fred:50:2026-09-04',
    name: 'Employment Situation (Nonfarm Payrolls)',
    category: 'macro',
    tsUtc: '2026-09-04T23:59:59.000Z',
    assets: ['ETH', 'BTC'],
  }),
  ev({
    id: 'fred:10:2026-09-11',
    name: 'CPI (Consumer Price Index)',
    category: 'macro',
    tsUtc: '2026-09-11T23:59:59.000Z',
    assets: ['ETH', 'BTC'],
  }),
];

describe('calendar pick', () => {
  it('prefers the next headline macro over a nearer crypto expiry', () => {
    expect(pickUpcomingEvent(shelf, 'ETH', now)?.id).toBe('fred:50:2026-09-04');
  });

  it('skips miscellaneous macros in favor of NFP/CPI/FOMC', () => {
    const withTrade: CalendarEvent[] = [
      ev({
        id: 'bea:trade',
        name: 'U.S. International Trade in Goods and Services',
        category: 'macro',
        tsUtc: '2026-09-03T23:59:59.000Z',
        assets: ['ETH', 'BTC'],
        importance: 'high',
      }),
      ...shelf,
    ];
    expect(pickUpcomingEvent(withTrade, 'ETH', now)?.id).toBe('fred:50:2026-09-04');
  });

  it('maps CPI utterance to the CPI shelf id', () => {
    const hit = inferNamedEvent('Cover my ETH through Friday CPI, max 3 USDC', shelf, 'ETH', now);
    expect(hit?.id).toBe('fred:10:2026-09-11');
  });
});
