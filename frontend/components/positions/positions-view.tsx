"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { HuskMascot } from "@/components/brand/husk-mascot";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useAgentAuto, useCalendar, useCoverages, useSettlePlan } from "@/hooks/useApi";
import { useBuyCoverage } from "@/hooks/useBuyCoverage";
import { eventNameFor, hoursUntilUnix, isExpiringSoon, pickNextEvent } from "@/lib/coverage";
import { ApiError } from "@/lib/errors";
import { basescanTx } from "@/lib/utils";
import { formatUnix, formatUsdc, latestActive, statusLabel } from "@/lib/format";
import { useUi } from "@/stores/ui";
import type { CoverageRow, QuoteStatus } from "@/lib/types";

type FilterId = "all" | "active" | "in_flight" | "expired_paid" | "expired_unpaid";

const FILTERS: { id: FilterId; label: string }[] = [
  { id: "all", label: "All" },
  { id: "active", label: "Active" },
  { id: "in_flight", label: "In flight" },
  { id: "expired_paid", label: "Paid out" },
  { id: "expired_unpaid", label: "Ended" },
];

function tone(status: QuoteStatus) {
  if (status === "active") return "husk" as const;
  if (status === "expired_paid") return "payout" as const;
  if (status === "failed" || status === "cancelled") return "danger" as const;
  if (status === "expired_unpaid") return "mute" as const;
  return "naked" as const;
}

export function PositionsView() {
  const { address, isConnected } = useAccount();
  const coverages = useCoverages(address);
  const calendar = useCalendar();
  const [filter, setFilter] = useState<FilterId>("all");
  const router = useRouter();
  const selectEvent = useUi((s) => s.selectEvent);
  const setPolicyOpen = useUi((s) => s.setPolicyOpen);
  const demoNowOffsetMs = useUi((s) => s.demoNowOffsetMs);
  const setDemoNowOffsetMs = useUi((s) => s.setDemoNowOffsetMs);
  const now = Date.now() + demoNowOffsetMs;

  const rows = coverages.data?.coverages ?? [];
  const events = calendar.data?.events ?? [];
  const live = latestActive(rows);
  const visible = rows.filter((r) => {
    if (filter === "all") return true;
    if (filter === "in_flight") return r.status === "rfq_open" || r.status === "awaiting_signature";
    return r.status === filter;
  });
  const next = pickNextEvent(events, { now, excludeId: live?.event_id });

  const paid = rows.find((r) => r.status === "expired_paid");
  const unpaid = rows.find((r) => r.status === "expired_unpaid");
  const ended = paid ?? unpaid;
  const rollingSoon = !!(live && live.status === "active" && isExpiringSoon(live.expiry_unix, now));
  const lastPremium = ended?.premium_usdc_onchain ?? live?.premium_usdc_onchain;

  const openRenew = () => {
    if (!next) {
      router.push("/");
      return;
    }
    selectEvent(next.id);
    setPolicyOpen(true);
    router.push("/");
  };

  const armDemoClock = () => {
    if (!live) return;
    const target = live.expiry_unix * 1000 - 8 * 3_600_000;
    setDemoNowOffsetMs(target - Date.now());
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col lg:grid lg:grid-cols-[minmax(16rem,22rem)_minmax(0,1fr)]">
      <section className="border-b border-line px-5 py-6 lg:border-b-0 lg:border-r lg:px-8 lg:py-8">
        <p className="text-[13px] text-mute">Policies</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight leading-[1.12]">Coverage book</h1>
        <div className="mt-8">
          <HuskMascot
            mood={paid ? "payout" : live?.status === "active" ? "active" : unpaid ? "error" : "normal"}
            size={180}
            className="mx-auto lg:mx-0"
          />
        </div>
        <dl className="mt-8 space-y-3 text-sm">
          <div className="flex justify-between">
            <dt className="text-mute">Active</dt>
            <dd data-numeric>{rows.filter((r) => r.status === "active").length}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-mute">In flight</dt>
            <dd data-numeric>{rows.filter((r) => r.status === "rfq_open" || r.status === "awaiting_signature").length}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-mute">Next expiry</dt>
            <dd className="text-right">{live ? formatUnix(live.expiry_unix) : "-"}</dd>
          </div>
          {live && rollingSoon ? (
            <div className="flex justify-between">
              <dt className="text-mute">Hours left</dt>
              <dd data-numeric>{Math.max(0, hoursUntilUnix(live.expiry_unix, now)).toFixed(1)}h</dd>
            </div>
          ) : null}
        </dl>

        {rollingSoon || ended ? (
          <div className="mt-6 rounded-card border border-line px-3 py-3 text-sm">
            <p className="text-ink">
              Coverage ends after this settlement. Next event: {next?.name ?? "none on the shelf"}.
              {lastPremium ? ` Premium last time ${formatUsdc(lastPremium)}.` : ""}
            </p>
            {next ? (
              <Button className="mt-3 w-full" onClick={openRenew}>
                Renew into {next.name}
              </Button>
            ) : null}
          </div>
        ) : null}

        {live?.status === "active" ? (
          <button
            type="button"
            className="mt-4 text-left text-xs text-mute hover:text-ink"
            onClick={() => (demoNowOffsetMs ? setDemoNowOffsetMs(0) : armDemoClock())}
          >
            {demoNowOffsetMs
              ? "Clear demo clock"
              : "Demo: show 8h before this settlement"}
          </button>
        ) : null}

        <AutonomousRoll connected={isConnected} wallet={address} />
      </section>

      <section className="px-4 py-6 lg:px-10 lg:py-8">
        {!isConnected ? (
          <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4">
            <p className="text-sm text-mute">Connect to load policies for this wallet.</p>
            <ConnectButton />
          </div>
        ) : (
          <>
            <div className="flex gap-1 overflow-x-auto no-scrollbar">
              {FILTERS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFilter(f.id)}
                  className={`h-8 shrink-0 rounded-pill px-3 text-xs ${
                    filter === f.id ? "bg-husk text-husk-fg" : "bg-sunken text-mute"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <div className="mt-5 space-y-2">
              {coverages.isLoading ? (
                Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-card" />)
              ) : visible.length === 0 ? (
                <p className="py-16 text-center text-sm text-mute">No policies in this filter.</p>
              ) : (
                visible.map((row) => (
                  <Row
                    key={row.id}
                    row={row}
                    eventName={eventNameFor(row.event_id, events)}
                    nextName={next?.name}
                    onRenew={
                      row.status === "expired_paid" || row.status === "expired_unpaid" ? openRenew : undefined
                    }
                  />
                ))
              )}
            </div>
          </>
        )}
      </section>
    </div>
  );
}

function AutonomousRoll({ connected, wallet }: { connected: boolean; wallet?: `0x${string}` }) {
  const auto = useAgentAuto();
  const [cap, setCap] = useState(3);
  const [events, setEvents] = useState(1);
  const [note, setNote] = useState<string | null>(null);

  const run = async () => {
    if (!wallet) return;
    setNote(null);
    try {
      const res = await auto.mutateAsync({
        wallet,
        maxNotionalUsdc: cap,
        utterance: `Keep me covered through the next ${events} event${events === 1 ? "" : "s"}. Never spend more than ${cap} USDC per event.`,
      });
      if (res.refusal) {
        setNote(res.refusal);
        return;
      }
      if (res.clarify) {
        setNote(res.clarify);
        return;
      }
      if (res.coverage) {
        setNote(`Roll prepared. Coverage ${res.coverage.coverageId} is ${res.coverage.status}.`);
        return;
      }
      if (res.quote) {
        setNote(`Quoted ${formatUsdc(res.quote.totalDebitUsdc)} USDC. Encode-only servers will not broadcast.`);
        return;
      }
      setNote("No quote returned.");
    } catch (err) {
      if (err instanceof ApiError && err.code === "NO_SIGNER") {
        setNote("Encode-only server. Judges use Ask Husk plus your wallet. Autonomous needs an operator signer.");
        return;
      }
      setNote(err instanceof ApiError ? err.message : "Autonomous roll failed.");
    }
  };

  return (
    <div className="mt-8 border-t border-line pt-6">
      <p className="text-sm font-medium">Automatic roll</p>
      <p className="mt-1 text-xs leading-relaxed text-mute">
        Off by default. Optional AgentKit path with a USDC cap per action. Demo first buys by hand, then this
        prepares the next event. Collateral allowlist is USDC only. Approvals stay exact.
      </p>
      <label className="mt-4 grid gap-1.5">
        <Label htmlFor="roll-n">Events to keep covering</Label>
        <input
          id="roll-n"
          type="range"
          min={1}
          max={4}
          step={1}
          value={events}
          onChange={(e) => setEvents(Number(e.target.value))}
          className="accent-[var(--husk)]"
        />
        <span className="font-mono text-xs text-mute" data-numeric>
          {events}
        </span>
      </label>
      <label className="mt-3 grid gap-1.5">
        <Label htmlFor="roll-cap">Cap per event (USDC)</Label>
        <input
          id="roll-cap"
          type="range"
          min={1}
          max={10}
          step={1}
          value={cap}
          onChange={(e) => setCap(Number(e.target.value))}
          className="accent-[var(--husk)]"
        />
        <span className="font-mono text-xs text-mute" data-numeric>
          {cap} USDC
        </span>
      </label>
      <Button
        className="mt-4 w-full"
        variant="secondary"
        disabled={!connected || auto.isPending}
        onClick={() => void run()}
      >
        {auto.isPending ? "Preparing roll" : "Prepare next event"}
      </Button>
      {note ? <p className="mt-2 text-xs text-mute">{note}</p> : null}
    </div>
  );
}

function Row({
  row,
  eventName,
  nextName,
  onRenew,
}: {
  row: CoverageRow;
  eventName: string | null;
  nextName?: string;
  onRenew?: () => void;
}) {
  const { settle } = useBuyCoverage();
  const quoteId = row.quote_id ?? "";
  const watching = row.status === "rfq_open" || row.status === "awaiting_signature";
  const settleQ = useSettlePlan(row.id, watching);

  const copy = useMemo(() => {
    if (row.status === "expired_paid") {
      return `Payout ${formatUsdc(row.max_payout_usdc)} credited. Your bag was protected${eventName ? ` through ${eventName}` : ""}.`;
    }
    if (row.status === "expired_unpaid") {
      return `Coverage ended. The bag stayed above the floor. Premium spent: ${formatUsdc(row.premium_usdc_onchain ?? "0")}.${nextName ? ` Same as last time, cover ${nextName}.` : ""}`;
    }
    return statusLabel(row.status);
  }, [eventName, nextName, row]);

  return (
    <article className="rounded-card border border-line bg-raised px-4 py-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium">
            {row.asset} {row.structure.replace("_", " ")}
            {eventName ? ` · ${eventName}` : ""}
          </p>
          <p className="mt-1 text-xs text-mute">{copy}</p>
        </div>
        <Badge tone={tone(row.status)}>{statusLabel(row.status)}</Badge>
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
        <div>
          <dt className="text-mute">Premium</dt>
          <dd data-numeric>{formatUsdc(row.premium_usdc_onchain)}</dd>
        </div>
        <div>
          <dt className="text-mute">Max payout</dt>
          <dd data-numeric>{formatUsdc(row.max_payout_usdc)}</dd>
        </div>
        <div>
          <dt className="text-mute">Expiry</dt>
          <dd>{formatUnix(row.expiry_unix)}</dd>
        </div>
        <div>
          <dt className="text-mute">Route</dt>
          <dd>{row.route}</dd>
        </div>
      </dl>
      <div className="mt-3 flex flex-wrap gap-3 text-xs">
        {row.open_tx ? (
          <a className="text-husk hover:underline" href={basescanTx(row.open_tx)} target="_blank" rel="noreferrer">
            Open tx
          </a>
        ) : null}
        {row.settle_tx ? (
          <a className="text-husk hover:underline" href={basescanTx(row.settle_tx)} target="_blank" rel="noreferrer">
            Settle tx
          </a>
        ) : null}
        {row.payout_tx ? (
          <a className="text-husk hover:underline" href={basescanTx(row.payout_tx)} target="_blank" rel="noreferrer">
            Payout tx
          </a>
        ) : null}
        {watching && settleQ.data?.settleCall && quoteId ? (
          <Button size="sm" onClick={() => settle(quoteId, settleQ.data!.settleCall!)}>
            Sign settle
          </Button>
        ) : null}
        {onRenew ? (
          <Button size="sm" variant="secondary" onClick={onRenew}>
            {nextName ? `Renew into ${nextName}` : "Renew"}
          </Button>
        ) : null}
      </div>
    </article>
  );
}
