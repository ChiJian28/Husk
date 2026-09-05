import type { CalendarEvent, CoverageRow } from "@/lib/types";
import { shelfDaysUntil } from "@/lib/format";

export type ShelfEventStatus = "past" | "open" | "pending" | "covered";

export type ShelfCoverageFilter = "all" | "uncovered" | "pending" | "covered";

export type ShelfTimeWindow = "all" | "3d" | "5d" | "7d";

/** Uncovered events within this horizon trigger the home urgency banner. */
export const URGENT_UNCOVERED_DAYS = 5;

export type ShelfImportanceFilter = "all" | "high" | "medium" | "low";

export type ShelfCategoryFilter = "all" | "macro" | "fed" | "crypto" | "derivatives" | "custom";

export type ShelfEventType = Exclude<ShelfCategoryFilter, "all">;

export type ShelfFilter = {
  coverage: ShelfCoverageFilter;
  timeWindow: ShelfTimeWindow;
  importance: ShelfImportanceFilter;
  category: ShelfCategoryFilter;
};

export const DEFAULT_SHELF_FILTER: ShelfFilter = {
  coverage: "all",
  timeWindow: "all",
  importance: "all",
  category: "all",
};

const LIVE_STATUSES = new Set(["active", "rfq_open", "awaiting_signature"]);

export function shelfEventStatus(
  event: CalendarEvent,
  rows: CoverageRow[],
  now = Date.now(),
): ShelfEventStatus {
  if (new Date(event.tsUtc).getTime() < now - 6 * 3_600_000) return "past";
  const hit = rows.find(
    (r) => r.event_id === event.id && LIVE_STATUSES.has(r.status),
  );
  if (hit?.status === "active") return "covered";
  if (hit) return "pending";
  return "open";
}

export function eventInTimeWindow(
  event: CalendarEvent,
  window: ShelfTimeWindow,
  now = Date.now(),
): boolean {
  const ts = new Date(event.tsUtc).getTime();
  if (!Number.isFinite(ts) || ts <= now) return false;
  if (window === "all") return true;
  const maxDays = window === "3d" ? 3 : window === "5d" ? 5 : 7;
  const days = shelfDaysUntil(event.tsUtc, now);
  return days !== null && days <= maxDays;
}

/** User-facing event type derived from calendar category + name. */
export function inferEventType(event: CalendarEvent): ShelfEventType {
  if (event.category === "custom") return "custom";

  const name = event.name.toLowerCase();
  const id = event.id.toLowerCase();

  if (
    event.category === "crypto_expiry" ||
    id.startsWith("deribit:") ||
    /\bderibit\b|\boptions expiry\b|\bcrypto expiry\b/.test(name)
  ) {
    return "derivatives";
  }

  if (/\bfomc\b|\bfed\b|federal reserve|rate decision/.test(name)) {
    return "fed";
  }

  if (/\bunlock\b|\bvesting\b|\bairdrop\b|token launch|mainnet|hard fork|\betf\b/.test(name)) {
    return "crypto";
  }

  if (event.category === "macro") return "macro";

  return "crypto";
}

export function eventTypeLabel(type: ShelfEventType) {
  switch (type) {
    case "macro":
      return "Macro";
    case "fed":
      return "Fed";
    case "crypto":
      return "Crypto";
    case "derivatives":
      return "Derivatives";
    case "custom":
      return "Custom";
  }
}

export function matchesShelfFilter(
  event: CalendarEvent,
  rows: CoverageRow[],
  filter: ShelfFilter,
  now = Date.now(),
): boolean {
  const status = shelfEventStatus(event, rows, now);
  if (status === "past") return false;
  if (filter.timeWindow !== "all" && !eventInTimeWindow(event, filter.timeWindow, now)) {
    return false;
  }
  if (filter.importance !== "all" && event.importance !== filter.importance) {
    return false;
  }
  if (filter.category !== "all" && inferEventType(event) !== filter.category) {
    return false;
  }
  switch (filter.coverage) {
    case "uncovered":
      return status === "open";
    case "pending":
      return status === "pending";
    case "covered":
      return status === "covered";
    default:
      return true;
  }
}

export function filterShelfEvents(
  events: CalendarEvent[],
  rows: CoverageRow[],
  filter: ShelfFilter,
  now = Date.now(),
): CalendarEvent[] {
  return events.filter((event) => matchesShelfFilter(event, rows, filter, now));
}

export function urgentUncoveredEvents(
  events: CalendarEvent[],
  rows: CoverageRow[],
  now = Date.now(),
  days = URGENT_UNCOVERED_DAYS,
): CalendarEvent[] {
  const window: ShelfTimeWindow = days <= 3 ? "3d" : days <= 5 ? "5d" : "7d";
  return filterShelfEvents(
    events,
    rows,
    { coverage: "uncovered", timeWindow: window, importance: "all", category: "all" },
    now,
  );
}

export function shelfFilterIsDefault(filter: ShelfFilter) {
  return (
    filter.coverage === DEFAULT_SHELF_FILTER.coverage &&
    filter.timeWindow === DEFAULT_SHELF_FILTER.timeWindow &&
    filter.importance === DEFAULT_SHELF_FILTER.importance &&
    filter.category === DEFAULT_SHELF_FILTER.category
  );
}

export function shelfFilterLabel(filter: ShelfFilter): string | null {
  if (shelfFilterIsDefault(filter)) return null;
  const parts: string[] = [];
  if (filter.coverage === "uncovered") parts.push("uncovered");
  else if (filter.coverage === "pending") parts.push("pending");
  else if (filter.coverage === "covered") parts.push("covered");
  if (filter.timeWindow === "3d") parts.push("due within 3 days");
  else if (filter.timeWindow === "5d") parts.push("due within 5 days");
  else if (filter.timeWindow === "7d") parts.push("due within 7 days");
  if (filter.importance === "high") parts.push("high importance");
  else if (filter.importance === "medium") parts.push("medium importance");
  else if (filter.importance === "low") parts.push("low importance");
  if (filter.category !== "all") parts.push(eventTypeLabel(filter.category).toLowerCase());
  return parts.length ? parts.join(", ") : null;
}
