import type { Asset, CalendarEvent } from '../types/policy.js';
import type { OfficialEvent, OfficialReport } from './schema.js';

function mapImportance(v?: string): CalendarEvent['importance'] {
  const s = (v ?? 'medium').toLowerCase();
  if (s === 'high' || s === 'medium' || s === 'low') return s;
  return 'medium';
}

function mapCategory(v: string): CalendarEvent['category'] {
  if (v === 'crypto_expiry') return 'crypto_expiry';
  if (v === 'custom') return 'custom';
  return 'macro';
}

function mapAssets(affected?: string[]): Asset[] {
  const set = new Set<Asset>();
  for (const a of affected ?? []) {
    const u = a.toUpperCase();
    if (u === 'ETH') set.add('ETH');
    if (u === 'BTC') set.add('BTC');
  }
  if (set.size === 0) return ['ETH', 'BTC'];
  return [...set];
}

function mapPrecision(raw?: string): CalendarEvent['tsPrecision'] {
  if (raw === 'date_only') return 'date_only';
  return 'datetime';
}

export function officialToCalendar(e: OfficialEvent, stale: boolean): CalendarEvent {
  return {
    id: e.id,
    source: 'thetanuts_calendar',
    name: e.name,
    category: mapCategory(e.category),
    importance: mapImportance(e.importance),
    assets: mapAssets(e.assets_affected),
    tsUtc: e.ts_utc,
    tsPrecision: mapPrecision(e.ts_precision),
    officialThesis: e.thesis,
    stale,
  };
}

export function normalizeOfficial(report: OfficialReport, stale: boolean): CalendarEvent[] {
  return report.events.map((e) => officialToCalendar(e, stale));
}

/** Drop events that ended more than 2h ago, keep 24h window for just-happened display. */
export function filterShelf(events: CalendarEvent[], now = Date.now()): CalendarEvent[] {
  return events
    .filter((e) => {
      const t = Date.parse(e.tsUtc);
      if (Number.isNaN(t)) return false;
      const age = now - t;
      if (age > 24 * 3600 * 1000) return false;
      return true;
    })
    .sort((a, b) => Date.parse(a.tsUtc) - Date.parse(b.tsUtc));
}
