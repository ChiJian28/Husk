"use client";

import { useMemo } from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { motion, useReducedMotion } from "motion/react";
import { useAccount } from "wagmi";
import { HuskHiMark } from "@/components/brand/husk-mascot";
import { UrgencyBanner } from "@/components/home/urgency-banner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useBrief, useCalendar, useCoverageQuotes, useCoverages, useHealth, useHoldings } from "@/hooks/useApi";
import { useMounted } from "@/hooks/useMounted";
import { coverageMetrics, pickNextEvent } from "@/lib/coverage";
import { buildHomeBrief, briefRollingSoon } from "@/lib/home-brief";
import { eventLinkClassName, linkableEvents, splitSummaryWithEventLinks } from "@/lib/brief-summary";
import { formatAsset, formatBriefGreeting, formatPct, formatUsdc, latestActive } from "@/lib/format";
import { SPRING } from "@/lib/constants";
import { useUi } from "@/stores/ui";

export function CoverageHero() {
  const mounted = useMounted();
  const { address, isConnected } = useAccount();
  const connected = mounted && isConnected;
  const holdings = useHoldings(address);
  const coverages = useCoverages(address);
  const briefQuery = useBrief(connected && address ? address : undefined);
  const health = useHealth();
  const calendar = useCalendar();
  const reduce = useReducedMotion();
  const selectEvent = useUi((s) => s.selectEvent);
  const setPolicyOpen = useUi((s) => s.setPolicyOpen);
  const setCustomOpen = useUi((s) => s.setCustomOpen);
  const demoNowOffsetMs = useUi((s) => s.demoNowOffsetMs);
  const now = Date.now() + demoNowOffsetMs;
  const rows = coverages.data?.coverages ?? [];
  const live = latestActive(rows);
  const quoteIds = rows.map((r) => r.quote_id).filter((id): id is string => !!id);
  const { quotes, isLoading: quotesLoading } = useCoverageQuotes(connected ? quoteIds : []);
  const metrics = coverageMetrics({
    holdings: holdings.data,
    rows,
    quotes,
    ethPrice: health.data?.ethPrice ?? null,
  });
  const calendarNext = mounted
    ? pickNextEvent(calendar.data?.events ?? [], { now, excludeId: live?.event_id })
    : undefined;
  const nextEvent = connected ? (briefQuery.data?.nextEvent ?? calendarNext) : calendarNext;
  const loading = connected && (holdings.isLoading || coverages.isLoading);
  const coverageLoading = loading || (connected && (quotesLoading || metrics.pendingNotional));
  const rollingSoon = connected
    ? (briefQuery.data?.rollingSoon ?? briefRollingSoon(live, now))
    : false;
  const liveStatus = connected ? (briefQuery.data?.liveStatus ?? live?.status) : undefined;

  const fallbackBrief = buildHomeBrief({
    connected,
    walletLabel: address,
    live: connected ? live : null,
    nextEvent: calendarNext,
    coveragePctEth: connected && metrics.coveragePctEth != null ? metrics.coveragePctEth : undefined,
    nakedUsd: connected ? metrics.nakedUsd : null,
    bagUsd: connected ? metrics.bagUsd : null,
    rollingSoon,
    now,
  });
  const brief = briefQuery.data ?? fallbackBrief;
  const briefLoading = connected && briefQuery.isLoading && !briefQuery.data;

  const openEvent = (id: string) => {
    setCustomOpen(false);
    selectEvent(id);
    setPolicyOpen(true);
  };

  const summaryEvents = useMemo(() => {
    const shelf = calendar.data?.events ?? [];
    const picks = nextEvent ? [nextEvent] : [];
    const liveEvent = live?.event_id ? shelf.find((e) => e.id === live.event_id) : undefined;
    if (liveEvent && !picks.some((e) => e.id === liveEvent.id)) picks.push(liveEvent);
    return linkableEvents(picks.length ? picks : shelf.slice(0, 1));
  }, [calendar.data?.events, live?.event_id, nextEvent]);

  const cta = () => {
    if (!nextEvent) {
      setCustomOpen(true);
      return;
    }
    selectEvent(nextEvent.id);
    setPolicyOpen(true);
  };

  const openLive = () => {
    if (live?.event_id) selectEvent(live.event_id);
    setPolicyOpen(true);
  };

  return (
    <section className="flex h-full min-h-0 flex-col gap-8">
      <div className="rounded-card border border-husk/25 bg-gradient-to-br from-husk-soft/50 via-raised to-raised p-5 md:p-6">
        <div className="flex items-start gap-4 md:gap-5">
          <HuskHiMark size={88} className="hidden shrink-0 sm:block" />
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.14em] text-husk">
              <span className="size-1.5 shrink-0 rounded-full bg-husk" aria-hidden />
              {briefLoading ? "Husk desk" : brief.kicker}
            </p>
            {briefLoading ? (
              <Skeleton className="mt-3 h-10 w-[min(100%,20rem)]" />
            ) : (
              <motion.h1
                key={brief.greeting}
                initial={reduce ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={SPRING}
                className="mt-2 text-[1.65rem] font-semibold tracking-tight leading-[1.15] md:text-[2rem]"
              >
                {formatBriefGreeting(brief.greeting)}
              </motion.h1>
            )}
            {briefLoading ? (
              <Skeleton className="mt-4 h-14 w-full max-w-2xl" />
            ) : (
              <p className="mt-3 max-w-[62ch] text-[15px] leading-relaxed text-mute">
                {splitSummaryWithEventLinks(brief.summary, summaryEvents, openEvent, eventLinkClassName)}
              </p>
            )}
          </div>
          <HuskHiMark size={72} className="shrink-0 sm:hidden" />
        </div>
      </div>

      <div className="shrink-0">
        <UrgencyBanner
          events={calendar.data?.events ?? []}
          rows={rows}
          now={now}
          connected={connected}
        />
      </div>

      <div className="grid shrink-0 grid-cols-2 gap-px overflow-hidden rounded-card border border-line bg-line sm:grid-cols-3">
        <Metric
          label="ETH bag"
          loading={loading}
          value={holdings.data ? formatAsset(holdings.data.ethBag, "ETH") : connected ? "0 ETH" : "-"}
        />
        <Metric
          label="cbBTC"
          loading={loading}
          value={holdings.data ? formatAsset(holdings.data.cbbtc, "cbBTC") : "-"}
        />
        <Metric
          label="USDC"
          loading={loading}
          value={holdings.data ? formatUsdc(holdings.data.usdc) : "-"}
        />
        <Metric
          label="Covered"
          loading={coverageLoading}
          value={
            connected
              ? metrics.coveragePctEth == null
                ? "—"
                : metrics.coveragePctBtc != null
                  ? `ETH ${formatPct(metrics.coveragePctEth)} / cbBTC ${formatPct(metrics.coveragePctBtc)}`
                  : formatPct(metrics.coveragePctEth)
              : "-"
          }
        />
        <Metric
          label="Naked notional"
          loading={coverageLoading}
          value={
            connected
              ? metrics.nakedUsd == null && metrics.nakedCbbtc === 0
                ? "—"
                : [
                    metrics.nakedUsd != null ? formatUsdc(metrics.nakedUsd.toFixed(2)) : null,
                    metrics.nakedCbbtc > 0 ? formatAsset(String(metrics.nakedCbbtc), "cbBTC") : null,
                  ]
                    .filter(Boolean)
                    .join(" + ") || formatUsdc("0")
              : "-"
          }
        />
        <Metric
          label="Bag (spot)"
          loading={loading}
          value={metrics.bagUsd != null ? formatUsdc(metrics.bagUsd.toFixed(2)) : "-"}
        />
      </div>

      <div className="mt-auto shrink-0 space-y-3">
        <div className="flex flex-wrap items-center gap-3">
        {!connected ? (
          <ConnectButton.Custom>
            {({ openConnectModal }) => (
              <Button size="lg" onClick={openConnectModal}>
                Connect wallet
              </Button>
            )}
          </ConnectButton.Custom>
        ) : liveStatus === "awaiting_signature" ? (
          <Button size="lg" onClick={openLive}>
            Sign to lock
          </Button>
        ) : liveStatus === "rfq_open" ? (
          <Button size="lg" variant="secondary" onClick={openLive}>
            Watch the RFQ
          </Button>
        ) : liveStatus === "active" && rollingSoon ? (
          <Button size="lg" onClick={cta}>
            Renew into {nextEvent?.name ?? "next event"}
          </Button>
        ) : liveStatus === "active" ? (
          <Button size="lg" variant="secondary" onClick={cta}>
            Extend coverage
          </Button>
        ) : (
          <Button size="lg" onClick={cta}>
            Cover the next event
          </Button>
        )}
        {nextEvent ? (
          <p className="text-sm text-mute">
            Next:{" "}
            <button type="button" onClick={() => openEvent(nextEvent.id)} className={eventLinkClassName}>
              {nextEvent.name}
            </button>
          </p>
        ) : null}
        </div>

        <p className="text-[11px] leading-relaxed text-mute">
          Not licensed insurance. Max loss equals the premium. Payout is a Chainlink TWAP claim, not a win.
        </p>
      </div>
    </section>
  );
}

function Metric({
  label,
  value,
  loading,
  className,
}: {
  label: string;
  value: string;
  loading?: boolean;
  className?: string;
}) {
  return (
    <div className={`min-h-[4.25rem] bg-raised px-4 py-3.5 ${className ?? ""}`}>
      <p className="text-[11px] text-mute">{label}</p>
      {loading ? (
        <Skeleton className="mt-2 h-6 w-24" />
      ) : (
        <p className="mt-1 font-mono text-[15px] tracking-tight" data-numeric>
          {value}
        </p>
      )}
    </div>
  );
}
