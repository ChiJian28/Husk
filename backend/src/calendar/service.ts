import { randomUUID } from 'node:crypto';
import { logger } from '../logger.js';
import { getServiceClient } from '../db/supabase.js';
import type { Asset, CalendarEvent } from '../types/policy.js';
import { fetchOfficialReport, persistSnapshot } from './fetchOfficial.js';
import { isSameMacroSlot, supplementEvents } from './supplement.js';
import { filterShelf, normalizeOfficial } from './normalize.js';
import { HuskError, NotFoundError } from '../errors.js';

let memoryShelf: CalendarEvent[] = [];
let lastStale = true;
let lastError: string | undefined;
let lastFetchedAt: string | undefined;

export function getFreshness() {
  return { stale: lastStale, lastFetchedAt, lastError };
}

async function upsertEvents(events: CalendarEvent[], snapshotId: string | null) {
  const db = getServiceClient();
  const rows = events.map((e) => ({
    id: e.id,
    source: e.source,
    name: e.name,
    category: e.category,
    importance: e.importance,
    assets: e.assets,
    ts_utc: e.tsUtc,
    ts_precision: e.tsPrecision,
    thesis: e.officialThesis ?? null,
    stale: e.stale,
    snapshot_id: snapshotId,
    updated_at: new Date().toISOString(),
  }));
  const { error } = await db.from('calendar_events').upsert(rows, { onConflict: 'id' });
  if (error) logger.warn({ err: error.message }, 'calendar_events upsert failed');
}

export async function syncCalendar(): Promise<{ events: CalendarEvent[]; stale: boolean }> {
  try {
    const report = await fetchOfficialReport();
    const hard = report.run_meta?.hard_expiry_at;
    const stale = hard ? Date.now() > Date.parse(hard) : false;
    lastStale = stale;
    lastError = undefined;
    lastFetchedAt = new Date().toISOString();
    const official = normalizeOfficial(report, stale);
    const merged = mergeShelf(official, supplementEvents());
    memoryShelf = filterShelf(merged);
    try {
      const persisted = await persistSnapshot(report);
      await upsertEvents(memoryShelf, persisted?.snapshotId ?? null);
    } catch (pe) {
      logger.warn({ err: pe instanceof Error ? pe.message : pe }, 'calendar persist skipped');
    }
    return { events: memoryShelf, stale };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    lastError = msg;
    logger.warn({ err: msg }, 'official calendar fetch failed; keeping previous shelf');
    if (memoryShelf.length === 0) {
      memoryShelf = filterShelf(supplementEvents());
    }
    return { events: memoryShelf, stale: true };
  }
}

function mergeShelf(official: CalendarEvent[], extra: CalendarEvent[]): CalendarEvent[] {
  const out = [...official];
  for (const s of extra) {
    const dup = official.some((o) => isSameMacroSlot(o, s));
    if (!dup) out.push(s);
  }
  return out;
}

export async function getShelf(): Promise<CalendarEvent[]> {
  if (memoryShelf.length === 0) {
    const db = getServiceClient();
    const { data, error } = await db.from('calendar_events').select('*').order('ts_utc', { ascending: true });
    if (!error && data && data.length > 0) {
      memoryShelf = filterShelf(
        data.map((r) => ({
          id: r.id as string,
          source: r.source as CalendarEvent['source'],
          name: r.name as string,
          category: r.category as CalendarEvent['category'],
          importance: r.importance as CalendarEvent['importance'],
          assets: (r.assets as Asset[]) ?? ['ETH', 'BTC'],
          tsUtc: new Date(r.ts_utc as string).toISOString(),
          tsPrecision: r.ts_precision as CalendarEvent['tsPrecision'],
          officialThesis: (r.thesis as string) || undefined,
          stale: Boolean(r.stale),
        })),
      );
    } else {
      await syncCalendar();
    }
  }
  return filterShelf(memoryShelf);
}

export async function getById(id: string): Promise<CalendarEvent> {
  const shelf = await getShelf();
  const hit = shelf.find((e) => e.id === id);
  if (hit) return hit;
  const db = getServiceClient();
  const { data } = await db.from('calendar_events').select('*').eq('id', id).maybeSingle();
  if (!data) throw new NotFoundError(`event ${id}`);
  return {
    id: data.id as string,
    source: data.source as CalendarEvent['source'],
    name: data.name as string,
    category: data.category as CalendarEvent['category'],
    importance: data.importance as CalendarEvent['importance'],
    assets: (data.assets as Asset[]) ?? ['ETH', 'BTC'],
    tsUtc: new Date(data.ts_utc as string).toISOString(),
    tsPrecision: data.ts_precision as CalendarEvent['tsPrecision'],
    officialThesis: (data.thesis as string) || undefined,
    stale: Boolean(data.stale),
  };
}

export async function createCustomEvent(input: {
  name: string;
  tsUtc: string;
  assets?: Asset[];
}): Promise<CalendarEvent> {
  const ts = Date.parse(input.tsUtc);
  if (Number.isNaN(ts)) throw new HuskError('INVALID_TIME', 'tsUtc must be ISO-8601');
  const ev: CalendarEvent = {
    id: `custom:${randomUUID()}`,
    source: 'custom',
    name: input.name,
    category: 'custom',
    importance: 'medium',
    assets: input.assets?.length ? input.assets : ['ETH'],
    tsUtc: new Date(ts).toISOString(),
    tsPrecision: 'datetime',
    stale: false,
  };
  memoryShelf = filterShelf([...memoryShelf, ev]);
  await upsertEvents([ev], null);
  return ev;
}

export function syntheticCustomWindow(endUtc: string, wallet: string): CalendarEvent {
  return {
    id: `custom:window:${wallet}:${endUtc}`,
    source: 'custom',
    name: `Custom coverage window until ${endUtc}`,
    category: 'custom',
    importance: 'medium',
    assets: ['ETH', 'BTC'],
    tsUtc: new Date(Date.parse(endUtc)).toISOString(),
    tsPrecision: 'datetime',
    stale: false,
  };
}
