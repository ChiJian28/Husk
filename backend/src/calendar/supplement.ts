import type { CalendarEvent } from '../types/policy.js';

/** Human-maintained events beyond the official ~7 day horizon. */
const SUPPLEMENT: Array<{
  id: string;
  name: string;
  tsUtc: string;
  tsPrecision: 'date_only' | 'datetime';
  importance: 'high' | 'medium' | 'low';
}> = [
  {
    id: 'supplement:fomc:2026-09-16',
    name: 'FOMC rate decision',
    tsUtc: '2026-09-16T18:00:00.000Z',
    tsPrecision: 'date_only',
    importance: 'high',
  },
  {
    id: 'supplement:fomc:2026-10-28',
    name: 'FOMC rate decision',
    tsUtc: '2026-10-28T18:00:00.000Z',
    tsPrecision: 'date_only',
    importance: 'high',
  },
  {
    id: 'supplement:fomc:2026-12-09',
    name: 'FOMC rate decision',
    tsUtc: '2026-12-09T19:00:00.000Z',
    tsPrecision: 'date_only',
    importance: 'high',
  },
  {
    id: 'supplement:nfp:2026-10-02',
    name: 'Employment Situation (Nonfarm Payrolls)',
    tsUtc: '2026-10-02T23:59:59.000Z',
    tsPrecision: 'date_only',
    importance: 'high',
  },
  {
    id: 'supplement:cpi:2026-10-14',
    name: 'CPI (Consumer Price Index)',
    tsUtc: '2026-10-14T23:59:59.000Z',
    tsPrecision: 'date_only',
    importance: 'high',
  },
];

export function supplementEvents(): CalendarEvent[] {
  return SUPPLEMENT.map((e) => ({
    id: e.id,
    source: 'supplement' as const,
    name: e.name,
    category: 'macro' as const,
    importance: e.importance,
    assets: ['ETH', 'BTC'] as const,
    tsUtc: e.tsUtc,
    tsPrecision: e.tsPrecision,
    stale: false,
  }));
}

export function isSameMacroSlot(
  a: { name: string; tsUtc: string },
  b: { name: string; tsUtc: string },
): boolean {
  const da = a.tsUtc.slice(0, 10);
  const db = b.tsUtc.slice(0, 10);
  if (da !== db) return false;
  const na = a.name.toUpperCase();
  const nb = b.name.toUpperCase();
  const keys = ['CPI', 'FOMC', 'PAYROLL', 'EMPLOYMENT', 'NFP'];
  return keys.some((k) => na.includes(k) && nb.includes(k));
}
