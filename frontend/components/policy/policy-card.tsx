"use client";

import { memo } from "react";
import { StressSlider } from "@/components/policy/stress-slider";
import { DryRunLog } from "@/components/policy/dry-run-log";
import { AccordionContent, AccordionItem, AccordionRoot, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { formatAsset, formatPct, formatUsdc, formatUtc } from "@/lib/format";
import { planApproveHuman, quoteAlreadyCovered, quoteBookEarnsZero } from "@/lib/coverage";
import { shortAddr } from "@/lib/utils";
import type { BrokerFeesResponse, ExecutionPlan, PolicyQuote } from "@/lib/types";

export const PolicyCard = memo(function PolicyCard({
  quote,
  plan,
  broker,
  compact,
}: {
  quote: PolicyQuote;
  plan?: ExecutionPlan | null;
  broker?: BrokerFeesResponse;
  compact?: boolean;
}) {
  const bookZero =
    quoteBookEarnsZero(quote) ||
    (quote.route === "OPTIONBOOK" && broker && "configured" in broker && broker.configured === false);
  const approve = plan ? planApproveHuman(plan.approveAmountUsdc) : NaN;

  return (
    <div className="space-y-5">
      <ol className="space-y-3">
        <Fact
          n="1"
          k="Protecting"
          v={formatAsset(quote.bag.protectedNotionalAsset, quote.intent.asset === "BTC" ? "cbBTC" : "ETH")}
        />
        <Fact n="2" k="Against" v={quote.event.name} />
        <Fact n="3" k="You pay" v={`${formatUsdc(quote.totalDebitUsdc)} USDC`} hint="This is the most you can lose." />
        <Fact
          n="4"
          k="If it dumps past the floor"
          v={`up to ${formatUsdc(quote.maxPayoutUsdc)} USDC`}
          hint={`Floor is ${formatPct(quote.deductiblePct)} below spot.`}
        />
        <Fact n="5" k="If it holds" v="Premium is spent." hint="Like unused insurance. Not a loss to recover." />
      </ol>

      <p className="text-[15px] leading-relaxed text-ink">{quote.copy.userSentence}</p>
      <p className="text-xs leading-relaxed text-mute">{quote.expiryReason}</p>
      <p className="text-xs text-mute">
        Expires {formatUtc(quote.expiryIso)}. Settlement: {quote.copy.settlement}.
      </p>

      {plan ? (
        <div className="rounded-card border border-line px-4 py-3 text-xs">
          <p className="text-mute">Locked to preview</p>
          <p className="mt-1 text-sm text-ink">
            Wallet approves {Number.isFinite(approve) ? formatUsdc(approve.toFixed(6)) : plan.approveAmountUsdc} USDC
            to {shortAddr(plan.spender)} (exact, not unlimited).
          </p>
          {quote.route === "RFQ" ? (
            <p className="mt-1 text-mute">RFQ reserve can sit above the filled premium. You still only lose the fill.</p>
          ) : null}
        </div>
      ) : null}

      {compact ? null : (
        <div className="rounded-card border border-line p-4">
          <StressSlider quoteId={quote.id} asset={quote.intent.asset ?? "ETH"} />
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <Badge tone={quote.route === "RFQ" ? "husk" : "mute"}>{quote.route === "RFQ" ? "RFQ" : "OptionBook"}</Badge>
        {quote.route === "OPTIONBOOK" && broker && "intendedBps" in broker ? (
          <Badge>broker {broker.intendedBps} bps disclosed</Badge>
        ) : null}
        {bookZero ? <Badge tone="naked">Book earns $0 today</Badge> : null}
        {quoteAlreadyCovered(quote) ? <Badge tone="naked">Already covered through this expiry</Badge> : null}
        {quote.warnings
          .filter((w) => !w.includes("BOOK_PATH_EARNS_ZERO") && w !== "ALREADY_COVERED")
          .map((w) => (
            <Badge key={w} tone="naked">
              {w}
            </Badge>
          ))}
      </div>

      <AccordionRoot type="single" collapsible>
        <AccordionItem value="advanced">
          <AccordionTrigger>Structure</AccordionTrigger>
          <AccordionContent>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 font-mono text-xs">
              <dt className="text-mute">Structure</dt>
              <dd>{quote.structure}</dd>
              <dt className="text-mute">Strikes USD</dt>
              <dd>{quote.strikesUsd.join(" / ")}</dd>
              <dt className="text-mute">Contracts</dt>
              <dd>{quote.numContractsHuman}</dd>
              <dt className="text-mute">Premium</dt>
              <dd>{quote.premiumUsdc} USDC</dd>
              <dt className="text-mute">Broker fee</dt>
              <dd>{quote.brokerFeeUsdc} USDC</dd>
              <dt className="text-mute">Why this expiry</dt>
              <dd className="col-span-2 font-sans text-mute">{quote.expiryReason}</dd>
            </dl>
          </AccordionContent>
        </AccordionItem>
      </AccordionRoot>

      <DryRunLog dryRun={quote.dryRun} />
    </div>
  );
});

function Fact({ n, k, v, hint }: { n: string; k: string; v: string; hint?: string }) {
  return (
    <li className="grid grid-cols-[2rem_1fr] gap-3">
      <span className="pt-1 font-mono text-xs text-mute">{n}</span>
      <span>
        <span className="block text-xs text-mute">{k}</span>
        <span className="text-[15px] font-medium">{v}</span>
        {hint ? <span className="mt-0.5 block text-xs text-mute">{hint}</span> : null}
      </span>
    </li>
  );
}
