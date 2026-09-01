import type {
  Address,
  CalendarEvent,
  CoverageRow,
  ExecutionPlan,
  HoldingsResponse,
  PolicyQuote,
} from "@/lib/types";

/** Empty burner. Backend tags EMPTY_BAG_DEMO_SIZE so disconnected home can show a real next-event quote. */
export const DEMO_WALLET: Address = (process.env.NEXT_PUBLIC_DEMO_WALLET as Address | undefined) ??
  "0x0000000000000000000000000000000000000001";

export const QUOTE_TTL_MS = 90_000;
export const ROLL_WINDOW_HOURS = 24;

export function pickNextEvent(
  events: CalendarEvent[],
  opts?: { now?: number; excludeId?: string | null },
) {
  const now = opts?.now ?? Date.now();
  const upcoming = events.filter((e) => {
    if (opts?.excludeId && e.id === opts.excludeId) return false;
    return new Date(e.tsUtc).getTime() > now;
  });
  return (
    upcoming.find((e) => e.category === "macro" && e.importance === "high") ??
    upcoming.find((e) => e.category === "macro") ??
    upcoming[0] ??
    events.find((e) => e.id !== opts?.excludeId) ??
    events[0]
  );
}

export function hoursUntilUnix(unix: number, now = Date.now()) {
  return (unix * 1000 - now) / 3_600_000;
}

export function isExpiringSoon(unix: number, now = Date.now()) {
  const h = hoursUntilUnix(unix, now);
  return h > 0 && h <= ROLL_WINDOW_HOURS;
}

export function eventNameFor(eventId: string | null, events: CalendarEvent[]) {
  if (!eventId) return null;
  return events.find((e) => e.id === eventId)?.name ?? null;
}

export function sourceLabel(source: CalendarEvent["source"]) {
  if (source === "thetanuts_calendar") return "thetanuts";
  if (source === "supplement") return "7d supplement";
  return "custom";
}

export function quoteHasOpenRfq(quote: PolicyQuote) {
  return quote.warnings.some((w) => w.includes("OPEN_RFQ_EXISTS"));
}

export function quoteAlreadyCovered(quote: PolicyQuote) {
  return quote.warnings.some((w) => w === "ALREADY_COVERED" || w.startsWith("ALREADY_COVERED"));
}

export function quoteBookEarnsZero(quote: PolicyQuote) {
  return quote.warnings.some((w) => w.includes("BOOK_PATH_EARNS_ZERO"));
}

export function parseCoverageIdFromMessage(message: string) {
  const trimmed = message.trim();
  const m =
    trimmed.match(/coverages\/([0-9a-f-]{8,})/i) ?? trimmed.match(/open RFQ\s+([0-9a-f-]{8,})/i);
  if (m?.[1]) return m[1];
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmed)) return trimmed;
  return null;
}

export function isQuoteStale(createdAt: string, now = Date.now()) {
  const t = new Date(createdAt).getTime();
  if (!Number.isFinite(t)) return true;
  return now - t > QUOTE_TTL_MS;
}

/**
 * Encode currently stringifies USDC *base units* (6 dp). Spec type is DecimalString (human).
 * Accept both so the confirm page can lock numbers either way.
 */
export function planApproveHuman(raw: string) {
  const n = Number(raw);
  if (!Number.isFinite(n)) return NaN;
  if (!raw.includes(".") && Math.abs(n) >= 1000) return n / 1e6;
  return n;
}

export function bookApproveDrift(quote: PolicyQuote, plan: ExecutionPlan) {
  if (quote.route !== "OPTIONBOOK") return 0;
  const debit = Number(quote.totalDebitUsdc);
  const approve = planApproveHuman(plan.approveAmountUsdc);
  if (!(debit > 0) || !Number.isFinite(approve)) return 0;
  return Math.abs(approve - debit) / debit;
}

export type CoverageMetrics = {
  coveragePctEth: number | null;
  coveragePctBtc: number | null;
  protectedEth: number;
  protectedCbbtc: number;
  nakedEth: number;
  nakedCbbtc: number;
  nakedUsd: number | null;
  bagUsd: number | null;
  cbbtc: number;
  ethBag: number;
  pendingNotional: boolean;
};

export function coverageMetrics(args: {
  holdings?: HoldingsResponse;
  rows: CoverageRow[];
  quotes: Record<string, PolicyQuote>;
  ethPrice: number | null;
}): CoverageMetrics {
  const ethBag = Number(args.holdings?.ethBag ?? 0);
  const cbbtc = Number(args.holdings?.cbbtc ?? 0);
  const bag = Number.isFinite(ethBag) ? ethBag : 0;
  const btc = Number.isFinite(cbbtc) ? cbbtc : 0;
  const active = args.rows.filter((r) => r.status === "active");

  let protectedEth = 0;
  let protectedCbbtc = 0;
  let hasEthPolicy = false;
  let hasBtcPolicy = false;
  let pendingNotional = false;
  let unknownNotional = false;

  for (const row of active) {
    const rowAsset = (row.asset ?? "ETH").toUpperCase();
    if (rowAsset === "BTC") hasBtcPolicy = true;
    else hasEthPolicy = true;

    const q = row.quote_id ? args.quotes[row.quote_id] : undefined;
    if (row.quote_id && !q) {
      pendingNotional = true;
      continue;
    }
    if (!q) {
      unknownNotional = true;
      continue;
    }
    const amt = Number(q.bag.protectedNotionalAsset);
    if (!Number.isFinite(amt)) {
      unknownNotional = true;
      continue;
    }
    const asset = (q.intent.asset ?? rowAsset).toUpperCase();
    if (asset === "BTC") protectedCbbtc += amt;
    else protectedEth += amt;
  }

  if (bag > 0) protectedEth = Math.min(protectedEth, bag);
  if (btc > 0) protectedCbbtc = Math.min(protectedCbbtc, btc);

  const incomplete = pendingNotional || unknownNotional;
  const nakedEth = incomplete ? 0 : Math.max(0, bag - protectedEth);
  const nakedCbbtc = incomplete ? 0 : Math.max(0, btc - protectedCbbtc);
  const price = args.ethPrice;
  const bagUsd = price != null && Number.isFinite(price) ? bag * price : null;
  const nakedUsd =
    incomplete || price == null || !Number.isFinite(price) ? null : nakedEth * price;

  const coveragePctEth = incomplete
    ? hasEthPolicy
      ? null
      : 0
    : bag > 0
      ? (protectedEth / bag) * 100
      : hasEthPolicy
        ? 100
        : 0;

  const coveragePctBtc = incomplete
    ? hasBtcPolicy
      ? null
      : btc > 0
        ? 0
        : null
    : btc > 0
      ? (protectedCbbtc / btc) * 100
      : hasBtcPolicy
        ? 100
        : null;

  return {
    coveragePctEth,
    coveragePctBtc,
    protectedEth,
    protectedCbbtc,
    nakedEth,
    nakedCbbtc,
    nakedUsd,
    bagUsd,
    cbbtc: btc,
    ethBag: bag,
    pendingNotional,
  };
}
