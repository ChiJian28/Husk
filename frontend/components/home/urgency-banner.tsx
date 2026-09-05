"use client";

import { ArrowRight, WarningCircle } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { urgentUncoveredEvents, URGENT_UNCOVERED_DAYS } from "@/lib/shelf-filter";
import type { CalendarEvent, CoverageRow } from "@/lib/types";
import { useUi } from "@/stores/ui";

export function UrgencyBanner({
  events,
  rows,
  now,
  connected,
}: {
  events: CalendarEvent[];
  rows: CoverageRow[];
  now: number;
  connected: boolean;
}) {
  const showUrgentShelf = useUi((s) => s.showUrgentShelf);
  const urgent = urgentUncoveredEvents(events, rows, now);
  const count = urgent.length;

  if (!connected || count === 0) return null;

  const label =
    count === 1
      ? `1 event lands within ${URGENT_UNCOVERED_DAYS} days and your bag isn't covered.`
      : `${count} events land within ${URGENT_UNCOVERED_DAYS} days and your bag isn't covered.`;

  return (
    <div className="flex flex-col gap-3 rounded-card border border-danger/35 bg-gradient-to-r from-danger/10 via-danger/5 to-transparent px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-start gap-3">
        <WarningCircle className="mt-0.5 size-5 shrink-0 text-danger" weight="fill" />
        <p className="text-sm font-medium leading-snug text-[color-mix(in_srgb,var(--danger)_72%,var(--ink))]">
          {label}
        </p>
      </div>
      <Button
        size="sm"
        variant="danger"
        className="shrink-0 self-start sm:self-center"
        onClick={() => {
          showUrgentShelf();
          document.getElementById("home-event-shelf")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
        }}
      >
        View uncovered
        <ArrowRight className="size-4" weight="bold" />
      </Button>
    </div>
  );
}
