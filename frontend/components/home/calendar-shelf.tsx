"use client";

import { CalendarBlank, Plus, Warning } from "@phosphor-icons/react";
import { useAccount } from "wagmi";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CustomWindow } from "@/components/home/custom-window";
import { DemoQuoteCard } from "@/components/home/demo-quote";
import { useCalendar, useCoverages } from "@/hooks/useApi";
import { useMounted } from "@/hooks/useMounted";
import { pickNextEvent, sourceLabel } from "@/lib/coverage";
import { countdownTo, eventWhen } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useUi } from "@/stores/ui";
import type { CalendarEvent, CoverageRow } from "@/lib/types";

function eventStatus(event: CalendarEvent, rows: CoverageRow[]) {
  const now = Date.now();
  if (new Date(event.tsUtc).getTime() < now - 6 * 3600_000) return "past";
  const hit = rows.find(
    (r) =>
      r.event_id === event.id &&
      (r.status === "active" || r.status === "rfq_open" || r.status === "awaiting_signature"),
  );
  if (hit?.status === "active") return "covered";
  if (hit) return "pending";
  return "open";
}

export function CalendarShelf() {
  const calendar = useCalendar();
  const mounted = useMounted();
  const { address, isConnected } = useAccount();
  const coverages = useCoverages(address);
  const selected = useUi((s) => s.selectedEventId);
  const selectEvent = useUi((s) => s.selectEvent);
  const setPolicyOpen = useUi((s) => s.setPolicyOpen);
  const customOpen = useUi((s) => s.customOpen);
  const setCustomOpen = useUi((s) => s.setCustomOpen);

  const events = calendar.data?.events ?? [];
  const rows = coverages.data?.coverages ?? [];
  const stale = calendar.data?.freshness.stale;
  const disconnected = mounted && !isConnected;
  const demoEvent = disconnected ? pickNextEvent(events) : undefined;

  return (
    <section className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Event shelf</h2>
          <p className="mt-1 text-sm text-mute">Each row is a policy you can buy, not a headline.</p>
        </div>
        <Button variant="secondary" size="sm" onClick={() => setCustomOpen(!customOpen)}>
          <Plus className="size-4" />
          Custom window
        </Button>
      </div>

      {stale ? (
        <p className="mt-3 flex items-center gap-1.5 text-xs text-naked">
          <Warning className="size-3.5" />
          Calendar feed is stale. Custom windows still work.
        </p>
      ) : null}

      {customOpen ? <CustomWindow /> : null}

      {demoEvent ? (
        <div className="mt-5">
          <DemoQuoteCard event={demoEvent} />
        </div>
      ) : null}

      <div className="mt-5 min-h-0 flex-1 overflow-y-auto no-scrollbar">
        {calendar.isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-[4.5rem] w-full rounded-card" />
            ))}
          </div>
        ) : calendar.isError ? (
          <p className="text-sm text-danger">Could not load the calendar.</p>
        ) : events.length === 0 ? (
          <EmptyShelf onCustom={() => setCustomOpen(true)} />
        ) : (
          <ul className="flex flex-col gap-2">
            {events.map((event) => {
              const status = eventStatus(event, rows);
              const active = selected === event.id;
              return (
                <li key={event.id}>
                  <button
                    type="button"
                    onClick={() => {
                      selectEvent(event.id);
                      setPolicyOpen(true);
                    }}
                    className={cn(
                      "flex w-full items-center gap-4 rounded-card border px-4 py-3.5 text-left transition-colors duration-200 ease-husk",
                      active ? "border-husk bg-husk-soft" : "border-line bg-raised hover:border-husk/50",
                    )}
                  >
                    <span className="hidden size-9 items-center justify-center rounded-input bg-sunken text-mute sm:flex">
                      <CalendarBlank className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="truncate text-sm font-medium">{event.name}</span>
                        {event.importance === "high" ? <Badge tone="husk">high</Badge> : null}
                        {event.stale ? <Badge>stale</Badge> : null}
                      </span>
                      <span className="mt-0.5 block text-xs text-mute">
                        {eventWhen(event)}
                        {event.assets.length ? ` · ${event.assets.join(", ")}` : ""}
                        {` · ${sourceLabel(event.source)}`}
                      </span>
                    </span>
                    <span className="flex shrink-0 flex-col items-end gap-1">
                      <span className="font-mono text-xs text-mute" data-numeric suppressHydrationWarning>
                        {countdownTo(event.tsUtc)}
                      </span>
                      <Badge
                        tone={status === "covered" ? "husk" : status === "open" ? "naked" : "mute"}
                      >
                        {status === "covered" ? "covered" : status === "pending" ? "pending" : status === "past" ? "past" : "open"}
                      </Badge>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}

function EmptyShelf({ onCustom }: { onCustom: () => void }) {
  return (
    <div className="rounded-card border border-dashed border-line px-5 py-10 text-center">
      <p className="text-sm text-mute">No events in the current window.</p>
      <Button className="mt-4" variant="secondary" onClick={onCustom}>
        Cover the next 48 hours
      </Button>
    </div>
  );
}
