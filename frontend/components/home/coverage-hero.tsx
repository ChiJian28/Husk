"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { motion, useReducedMotion } from "motion/react";
import { useAccount } from "wagmi";
import { HuskMascot } from "@/components/brand/husk-mascot";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useCalendar, useCoverageQuotes, useCoverages, useHealth, useHoldings } from "@/hooks/useApi";
import { useMounted } from "@/hooks/useMounted";
import { SPRING } from "@/lib/constants";
import { coverageMetrics, isExpiringSoon, pickNextEvent } from "@/lib/coverage";
import { coverageHeadline, formatAsset, formatPct, formatUsdc, latestActive } from "@/lib/format";
import { useUi } from "@/stores/ui";
import type { MascotMood } from "@/lib/constants";

function moodFrom(kind: ReturnType<typeof coverageHeadline>["mood"]): MascotMood {
  if (kind === "covered") return "active";
  if (kind === "naked") return "error";
  if (kind === "pending") return "approaching";
  return "normal";
}

export function CoverageHero() {
  const mounted = useMounted();
  const { address, isConnected } = useAccount();
  const holdings = useHoldings(address);
  const coverages = useCoverages(address);
  const health = useHealth();
  const calendar = useCalendar();
  const reduce = useReducedMotion();
  const selectEvent = useUi((s) => s.selectEvent);
  const setPolicyOpen = useUi((s) => s.setPolicyOpen);
  const setCustomOpen = useUi((s) => s.setCustomOpen);
  const demoNowOffsetMs = useUi((s) => s.demoNowOffsetMs);
  const now = Date.now() + demoNowOffsetMs;

  const connected = mounted && isConnected;
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
  const headline = coverageHeadline({
    connected,
    live: connected ? live : null,
    coveragePctEth: connected && metrics.coveragePctEth != null ? metrics.coveragePctEth : undefined,
  });
  const nextEvent = mounted
    ? pickNextEvent(calendar.data?.events ?? [], { now, excludeId: live?.event_id })
    : undefined;
  const loading = connected && (holdings.isLoading || coverages.isLoading);
  const coverageLoading = loading || (connected && (quotesLoading || metrics.pendingNotional));
  const rollingSoon = !!(live && live.status === "active" && isExpiringSoon(live.expiry_unix, now));

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
    <section className="flex h-full min-h-0 flex-col justify-between gap-8">
      <div className="flex items-start justify-between gap-6">
        <div className="min-w-0 max-w-xl">
          <p className="text-[13px] text-mute">{headline.kicker}</p>
          {loading ? (
            <Skeleton className="mt-3 h-12 w-[22rem] max-w-full" />
          ) : (
            <motion.h1
              key={headline.title}
              initial={reduce ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={SPRING}
              className="mt-2 text-[2.15rem] font-semibold tracking-tight leading-[1.1] md:text-[2.6rem]"
            >
              {headline.title}
            </motion.h1>
          )}
          <p className="mt-4 max-w-[42ch] text-[15px] leading-relaxed text-mute">
            {connected
              ? rollingSoon
                ? `Coverage ends after this settlement. Next event: ${nextEvent?.name ?? "pick from the shelf"}.`
                : live
                  ? "Max loss is the premium you already paid. Settlement is Chainlink TWAP, not a claim form."
                  : "The next print can jump the bag. Coverage is a defined-risk put spread that expires the morning after."
              : "A live next-event quote sits on the shelf. Connect a Base wallet to buy it for your bag."}
          </p>
        </div>
        <HuskMascot mood={moodFrom(headline.mood)} size={168} priority className="hidden shrink-0 sm:block" />
      </div>

      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-card border border-line bg-line sm:grid-cols-3">
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

      <div className="flex flex-wrap items-center gap-3">
        {!connected ? (
          <ConnectButton.Custom>
            {({ openConnectModal }) => (
              <Button size="lg" onClick={openConnectModal}>
                Connect wallet
              </Button>
            )}
          </ConnectButton.Custom>
        ) : live?.status === "awaiting_signature" ? (
          <Button size="lg" onClick={openLive}>
            Sign to lock
          </Button>
        ) : live?.status === "rfq_open" ? (
          <Button size="lg" variant="secondary" onClick={openLive}>
            Watch the RFQ
          </Button>
        ) : live?.status === "active" && rollingSoon ? (
          <Button size="lg" onClick={cta}>
            Renew into {nextEvent?.name ?? "next event"}
          </Button>
        ) : live?.status === "active" ? (
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
            Next: <span className="text-ink">{nextEvent.name}</span>
          </p>
        ) : null}
      </div>

      <p className="text-[11px] leading-relaxed text-mute">
        Not licensed insurance. Max loss equals the premium. Payout is a Chainlink TWAP claim, not a win.
      </p>
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
    <div className={`bg-raised px-4 py-3.5 ${className ?? ""}`}>
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
