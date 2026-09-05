import { getFreshness, getShelf } from '../calendar/service.js';
import { pickUpcomingEvent } from '../calendar/pick.js';
import { listCoverages } from '../coverage/service.js';
import { getQuoteRow } from '../coverage/repo.js';
import { getHoldings } from '../holdings/service.js';
import { getReadClient } from '../thetanuts/client.js';
import type { CalendarEvent, PolicyQuote } from '../types/policy.js';
import { buildHomeBrief, briefRollingSoon } from './copy.js';
import { polishBriefWithGemini } from './explain.js';
import { stripThesis } from './format.js';
import { computeBriefMetrics, latestLiveCoverage, type CoverageRow } from './metrics.js';

export type WalletBrief = {
  wallet: string;
  kicker: string;
  greeting: string;
  summary: string;
  source: 'template' | 'gemini';
  rollingSoon: boolean;
  nextEvent?: Omit<CalendarEvent, 'officialThesis'>;
  liveStatus?: CoverageRow['status'];
  calendar: ReturnType<typeof getFreshness>;
};

async function ethSpotPrice(): Promise<number | null> {
  try {
    const md = await getReadClient().api.getMarketData();
    const raw = md.prices?.ETH;
    const n = typeof raw === 'number' ? raw : Number(raw);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

function asCoverageRow(row: Record<string, unknown>): CoverageRow {
  return {
    status: row.status as CoverageRow['status'],
    event_id: (row.event_id as string | null) ?? null,
    expiry_unix: Number(row.expiry_unix),
    quote_id: (row.quote_id as string | null) ?? null,
    asset: (row.asset as string | null) ?? null,
  };
}

function pickNextForWallet(
  shelf: CalendarEvent[],
  excludeEventId: string | null | undefined,
  now: number,
): CalendarEvent | undefined {
  const filtered = excludeEventId ? shelf.filter((e) => e.id !== excludeEventId) : shelf;
  return pickUpcomingEvent(filtered, 'ETH', now);
}

export async function getWalletBrief(wallet: string, opts?: { ai?: boolean }): Promise<WalletBrief> {
  const normalized = wallet.toLowerCase();
  const now = Date.now();
  const useAi = opts?.ai !== false;

  const [holdings, rowsRaw, shelf, ethPrice] = await Promise.all([
    getHoldings(normalized),
    listCoverages(normalized),
    getShelf(),
    ethSpotPrice(),
  ]);

  const rows = rowsRaw.map((r) => asCoverageRow(r as Record<string, unknown>));
  const live = latestLiveCoverage(rows);

  const quoteIds = [
    ...new Set(rows.map((r) => r.quote_id).filter((id): id is string => !!id)),
  ];
  const quotes: Record<string, PolicyQuote> = {};
  await Promise.all(
    quoteIds.map(async (id) => {
      const row = await getQuoteRow(id);
      if (row) quotes[id] = row.quote;
    }),
  );

  const metrics = computeBriefMetrics({
    ethBagHuman: holdings.ethBagHuman,
    cbbtcHuman: holdings.cbbtcHuman,
    rows,
    quotes,
    ethPrice,
  });

  const nextEvent = pickNextForWallet(shelf, live?.event_id, now);
  const rollingSoon = briefRollingSoon(live, now);

  const draft = buildHomeBrief({
    wallet: normalized,
    live,
    nextEvent,
    coveragePctEth: metrics.coveragePctEth,
    nakedUsd: metrics.nakedUsd,
    rollingSoon,
    now,
  });

  const context = {
    wallet: normalized,
    ethBag: holdings.ethBagHuman,
    cbbtc: holdings.cbbtcHuman,
    usdc: holdings.usdcHuman,
    coveragePctEth: metrics.coveragePctEth,
    coveragePctBtc: metrics.coveragePctBtc,
    nakedUsd: metrics.nakedUsd,
    bagUsd: metrics.bagUsd,
    liveStatus: live?.status ?? null,
    liveExpiryUnix: live?.expiry_unix ?? null,
    rollingSoon,
    nextEvent: nextEvent
      ? { id: nextEvent.id, name: nextEvent.name, tsUtc: nextEvent.tsUtc, importance: nextEvent.importance }
      : null,
    calendarStale: getFreshness().stale,
  };

  let brief = draft;
  let source: WalletBrief['source'] = 'template';
  if (useAi) {
    const polished = await polishBriefWithGemini(context, draft);
    if (polished) {
      brief = polished;
      source = 'gemini';
    }
  }

  return {
    wallet: normalized,
    kicker: brief.kicker,
    greeting: brief.greeting,
    summary: brief.summary,
    source,
    rollingSoon,
    nextEvent: nextEvent ? stripThesis(nextEvent) : undefined,
    liveStatus: live?.status,
    calendar: getFreshness(),
  };
}
