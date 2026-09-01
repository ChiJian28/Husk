"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { DryRunLog } from "@/components/policy/dry-run-log";
import { useDemoQuote } from "@/hooks/useApi";
import { formatUsdc } from "@/lib/format";
import type { CalendarEvent } from "@/lib/types";

export function DemoQuoteCard({ event }: { event: CalendarEvent }) {
  const demo = useDemoQuote(event.id, true);

  return (
    <div className="rounded-card border border-line bg-raised px-4 py-4">
      <p className="text-[11px] text-mute">Read-only next event</p>
      <p className="mt-1 text-sm font-medium">{event.name}</p>
      {demo.isLoading ? (
        <Skeleton className="mt-3 h-16 w-full rounded-input" />
      ) : demo.data?.quote ? (
        <>
          <p className="mt-2 text-sm leading-relaxed text-ink">
            Pay {formatUsdc(demo.data.quote.totalDebitUsdc)} USDC. Max payout {formatUsdc(demo.data.quote.maxPayoutUsdc)}.{" "}
            {demo.data.quote.expiryReason}
          </p>
          <div className="mt-3">
            <DryRunLog dryRun={demo.data.quote.dryRun} />
          </div>
        </>
      ) : (
        <p className="mt-2 text-sm text-mute">
          Connect to price a shell around this event. Calendar rows stay clickable either way.
        </p>
      )}
      <div className="mt-4">
        <ConnectButton.Custom>
          {({ openConnectModal }) => (
            <Button onClick={openConnectModal}>Connect wallet</Button>
          )}
        </ConnectButton.Custom>
      </div>
    </div>
  );
}
