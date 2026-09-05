import type { ReactNode } from "react";
import type { CalendarEvent } from "@/lib/types";

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function linkableEvents(
  events: CalendarEvent[],
  extra?: { id: string; name: string } | null,
): CalendarEvent[] {
  const byId = new Map<string, CalendarEvent>();
  for (const event of events) byId.set(event.id, event);
  if (extra?.id && extra.name && !byId.has(extra.id)) {
    byId.set(extra.id, {
      id: extra.id,
      name: extra.name,
      source: "custom",
      category: "custom",
      importance: "medium",
      assets: ["ETH"],
      tsUtc: new Date().toISOString(),
      tsPrecision: "datetime",
      stale: false,
    });
  }
  return [...byId.values()].sort((a, b) => b.name.length - a.name.length);
}

export function splitSummaryWithEventLinks(
  summary: string,
  events: CalendarEvent[],
  onSelect: (id: string) => void,
  linkClassName: string,
): ReactNode {
  if (!events.length) return summary;

  const pattern = events.map((e) => escapeRegex(e.name)).join("|");
  if (!pattern) return summary;

  const nameToId = Object.fromEntries(events.map((e) => [e.name, e.id]));
  const parts = summary.split(new RegExp(`(${pattern})`, "g"));

  return parts.map((part, index) => {
    const id = nameToId[part];
    if (!id) return <span key={`${index}-${part.slice(0, 12)}`}>{part}</span>;
    return (
      <button
        key={`${index}-${id}`}
        type="button"
        onClick={() => onSelect(id)}
        className={linkClassName}
      >
        {part}
      </button>
    );
  });
}

export const eventLinkClassName =
  "cursor-pointer font-semibold text-husk underline decoration-husk decoration-2 underline-offset-[3px] transition-colors duration-200 ease-husk hover:text-husk focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-husk/40";
