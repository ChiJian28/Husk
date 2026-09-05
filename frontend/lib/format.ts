import type { CalendarEvent, CoverageRow, HoldingsResponse, QuoteStatus } from "@/lib/types";

const fmtUsd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

const fmtUsdTight = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 4,
});

const fmtNum = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 4,
});

export function formatUsdc(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") return "-";
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return String(value);
  return n >= 10 ? fmtUsd.format(n) : fmtUsdTight.format(n);
}

export function formatBriefGreeting(greeting: string) {
  return greeting.replace(/0x[a-fA-F0-9]+/g, (match) => {
    if (match.length <= 13) return match;
    return `${match.slice(0, 6)}....${match.slice(-4)}`;
  });
}

export function formatAsset(value: string, symbol: string) {
  const n = Number(value);
  if (!Number.isFinite(n)) return `${value} ${symbol}`;
  return `${fmtNum.format(n)} ${symbol}`;
}

export function formatPct(value: number) {
  return `${value % 1 === 0 ? value.toFixed(0) : value.toFixed(1)}%`;
}

export function formatUtc(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "UTC",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d) + " UTC";
}

export function formatUnix(unix: number) {
  return formatUtc(new Date(unix * 1000).toISOString());
}

export function shelfDaysUntil(iso: string, now = Date.now()): number | null {
  const target = new Date(iso).getTime();
  const delta = target - now;
  if (!Number.isFinite(target) || delta <= 0) return null;
  const h = Math.floor(delta / 3_600_000);
  return Math.floor(h / 24);
}

export function countdownTo(iso: string, now = Date.now()) {
  const target = new Date(iso).getTime();
  const delta = target - now;
  if (!Number.isFinite(target)) return "";
  if (delta <= 0) return "started";
  const h = Math.floor(delta / 3_600_000);
  const d = Math.floor(h / 24);
  if (d >= 2) return `${d}d`;
  if (h >= 1) return `${h}h`;
  const m = Math.max(1, Math.floor(delta / 60_000));
  return `${m}m`;
}

export function eventWhen(event: CalendarEvent) {
  if (event.tsPrecision === "date_only") {
    return new Intl.DateTimeFormat("en-GB", {
      timeZone: "UTC",
      month: "short",
      day: "2-digit",
      year: "numeric",
    }).format(new Date(event.tsUtc));
  }
  return formatUtc(event.tsUtc);
}

const LIVE: QuoteStatus[] = ["active", "rfq_open", "awaiting_signature"];

export function liveCoverages(rows: CoverageRow[]) {
  return rows.filter((r) => LIVE.includes(r.status));
}

export function latestActive(rows: CoverageRow[]) {
  const live = liveCoverages(rows).sort((a, b) => b.expiry_unix - a.expiry_unix);
  return live[0] ?? null;
}

export function bagUsd(holdings: HoldingsResponse | undefined, ethPrice: number | null) {
  if (!holdings) return null;
  const eth = Number(holdings.ethBag);
  if (!Number.isFinite(eth) || ethPrice === null) return null;
  return eth * ethPrice;
}

export function coverageHeadline(args: {
  connected: boolean;
  live: CoverageRow | null;
  coveragePctEth?: number;
}): { kicker: string; title: string; mood: "naked" | "pending" | "covered" | "idle" } {
  if (!args.connected) {
    return {
      kicker: "Base · ETH & cbBTC",
      title: "See if this bag is naked",
      mood: "idle",
    };
  }
  const pct = args.coveragePctEth;
  const pctLabel = pct != null ? `${formatPct(pct)} of ETH bag` : null;
  if (!args.live) {
    return {
      kicker: pctLabel ?? "Uncovered",
      title: "Your bag is naked",
      mood: "naked",
    };
  }
  if (args.live.status === "rfq_open") {
    return {
      kicker: "Waiting on a maker offer",
      title: "Coverage is in flight",
      mood: "pending",
    };
  }
  if (args.live.status === "awaiting_signature") {
    return {
      kicker: "Settle ready",
      title: "Sign to lock coverage",
      mood: "pending",
    };
  }
  return {
    kicker: pctLabel ?? "Covered",
    title: `Covered through ${formatUnix(args.live.expiry_unix)}`,
    mood: "covered",
  };
}

export function statusLabel(status: QuoteStatus) {
  switch (status) {
    case "rfq_open":
      return "Waiting for offer";
    case "awaiting_signature":
      return "Sign to settle";
    case "active":
      return "Coverage active";
    case "expired_paid":
      return "Paid out";
    case "expired_unpaid":
      return "Expired, no payout";
    case "failed":
      return "Failed";
    case "cancelled":
      return "Cancelled";
    case "quoted":
      return "Quoted";
    default:
      return status;
  }
}
