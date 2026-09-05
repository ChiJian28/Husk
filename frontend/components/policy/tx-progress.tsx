"use client";

import type { ReactNode } from "react";
import { CircleNotch } from "@phosphor-icons/react";
import { useAccount } from "wagmi";
import { Button } from "@/components/ui/button";
import { useBuyCoverage } from "@/hooks/useBuyCoverage";
import { useSettlePlan } from "@/hooks/useApi";
import { basescanTx } from "@/lib/utils";
import { useUi } from "@/stores/ui";

function rfqWaitCopy(offerEndUnix: number | undefined, offers: number, quotationId?: string) {
  const id = quotationId ? `Quotation ${quotationId}. ` : "";
  if (offerEndUnix) {
    const left = offerEndUnix - Math.floor(Date.now() / 1000);
    if (left <= 0) {
      return `${id}Offer window ended. If nobody bid, the USDC reserve stays in the factory until you cancel.`;
    }
    const mins = Math.max(1, Math.ceil(left / 60));
    return `${id}Sealed RFQ, not an instant fill. About ${mins} min left in the 15-minute window.${offers === 0 ? " No bid yet." : ""}`;
  }
  return `${id}Sealed RFQ, not an instant fill. Makers have about 15 minutes to bid.${offers === 0 ? " No bid yet." : ""}`;
}

export function TxProgress() {
  const phase = useUi((s) => s.buyPhase);
  const error = useUi((s) => s.buyError);
  const step = useUi((s) => s.signStep);
  const hash = useUi((s) => s.lastTxHash);
  const coverageId = useUi((s) => s.coverageId);
  const quote = useUi((s) => s.quote);
  const { settle, cancelRfq } = useBuyCoverage();
  const settleQ = useSettlePlan(coverageId ?? undefined, phase === "rfq_waiting");

  if (phase === "idle" || phase === "quoting" || phase === "review") {
    if (error) return <p className="text-sm text-danger">{error}</p>;
    return null;
  }

  return (
    <div className="rounded-card border border-line px-4 py-3 text-sm">
      {phase === "planning" ? <Line busy>Encoding the unsigned calls</Line> : null}
      {phase === "signing" && step ? (
        <Line busy>
          Sign {step.index}/{step.total}: {step.description}
        </Line>
      ) : null}
      {phase === "verifying" ? <Line busy>Verifying on Base</Line> : null}
      {phase === "rfq_waiting" ? (
        <div className="space-y-2">
          <Line busy={!settleQ.data?.settleCall}>
            {settleQ.data?.settleCall
              ? "Maker offered. Sign to lock coverage."
              : "RFQ is open on-chain. Waiting for a maker bid."}
          </Line>
          <p className="text-xs text-mute">
            {rfqWaitCopy(settleQ.data?.offerEndUnix, settleQ.data?.offers ?? 0, settleQ.data?.quotationId)}
          </p>
          {settleQ.data?.settleCall && quote ? (
            <Button size="sm" onClick={() => settle(quote.id, settleQ.data!.settleCall!)}>
              Sign early settle
            </Button>
          ) : null}
          {coverageId ? (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => cancelRfq(coverageId)}
            >
              Cancel RFQ and reclaim USDC
            </Button>
          ) : null}
          {settleQ.data?.error ? <p className="text-danger">{settleQ.data.error}</p> : null}
        </div>
      ) : null}
      {phase === "active" ? <Line done>Coverage active. Max loss is the premium.</Line> : null}
      {phase === "cancelled" ? <Line done>RFQ cancelled. USDC reserve should be back in the wallet.</Line> : null}
      {phase === "error" ? <p className="text-danger">{error}</p> : null}
      {hash ? (
        <a href={basescanTx(hash)} className="mt-2 inline-block text-xs text-husk underline-offset-2 hover:underline" target="_blank" rel="noreferrer">
          View on Basescan
        </a>
      ) : null}
    </div>
  );
}

function Line({ children, busy, done }: { children: ReactNode; busy?: boolean; done?: boolean }) {
  return (
    <p className={done ? "text-payout" : "text-ink"}>
      {busy ? <CircleNotch className="mr-2 inline size-3.5 animate-spin" /> : null}
      {children}
    </p>
  );
}

export function RfqWatcher() {
  const { address } = useAccount();
  const coverageId = useUi((s) => s.coverageId);
  const phase = useUi((s) => s.buyPhase);
  useSettlePlan(coverageId ?? undefined, phase === "rfq_waiting" && !!address);
  return null;
}
