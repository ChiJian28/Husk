"use client";

import { ArrowSquareOut } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { TxProgress } from "@/components/policy/tx-progress";
import { askSignDisabled, askSignLabel } from "@/lib/ask-quote-summary";
import { formatUsdc, formatUtc } from "@/lib/format";
import type { BuyPhase } from "@/stores/ui";
import type { ExecutionPlan, PolicyQuote } from "@/lib/types";
import { useUi } from "@/stores/ui";

type AskQuoteOfferProps = {
  quote: PolicyQuote;
  plan?: ExecutionPlan | null;
  buyPhase: BuyPhase;
  isConnected: boolean;
  onSign: () => void;
};

export function AskQuoteOffer({ quote, plan, buyPhase, isConnected, onSign }: AskQuoteOfferProps) {
  const selectEvent = useUi((s) => s.selectEvent);
  const setPolicyOpen = useUi((s) => s.setPolicyOpen);
  const setChatOpen = useUi((s) => s.setChatOpen);

  const openFullPolicy = () => {
    selectEvent(quote.event.id);
    setPolicyOpen(true);
    setChatOpen(false);
  };

  return (
    <div className="ml-11 w-full max-w-[calc(100%-2.75rem)] space-y-3">
      <div className="rounded-card border border-line bg-canvas px-4 py-3">
        <dl className="grid grid-cols-3 gap-3 text-center">
          <Stat label="You pay" value={`${formatUsdc(quote.totalDebitUsdc)}`} sub="max loss" />
          <Stat label="Max payout" value={`${formatUsdc(quote.maxPayoutUsdc)}`} sub="if dump" />
          <Stat label="Expires" value={formatUtc(quote.expiryIso).replace(" UTC", "")} sub={quote.route} />
        </dl>

        <Button
          className="mt-4 w-full"
          disabled={askSignDisabled(isConnected, buyPhase, Boolean(plan))}
          onClick={onSign}
        >
          {askSignLabel(buyPhase, Boolean(plan))}
        </Button>

        <button
          type="button"
          onClick={openFullPolicy}
          className="mt-3 flex w-full items-center justify-center gap-1.5 text-xs text-mute transition-colors hover:text-husk"
        >
          Stress test & full policy
          <ArrowSquareOut className="size-3.5" />
        </button>
      </div>

      <TxProgress />
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-wide text-mute">{label}</dt>
      <dd className="mt-0.5 text-sm font-semibold tabular-nums">{value}</dd>
      <dd className="text-[10px] text-mute">{sub}</dd>
    </div>
  );
}
