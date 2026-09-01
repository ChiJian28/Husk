"use client";

import type { ReactNode } from "react";
import { CircleNotch } from "@phosphor-icons/react";
import { useAccount } from "wagmi";
import { Button } from "@/components/ui/button";
import { useBuyCoverage } from "@/hooks/useBuyCoverage";
import { useSettlePlan } from "@/hooks/useApi";
import { basescanTx } from "@/lib/utils";
import { useUi } from "@/stores/ui";

export function TxProgress() {
  const phase = useUi((s) => s.buyPhase);
  const error = useUi((s) => s.buyError);
  const step = useUi((s) => s.signStep);
  const hash = useUi((s) => s.lastTxHash);
  const coverageId = useUi((s) => s.coverageId);
  const quote = useUi((s) => s.quote);
  const { settle } = useBuyCoverage();
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
          <Line busy>RFQ is open. Waiting for a maker offer.</Line>
          {settleQ.data?.settleCall && quote ? (
            <Button size="sm" onClick={() => settle(quote.id, settleQ.data!.settleCall!)}>
              Sign early settle
            </Button>
          ) : null}
          {settleQ.data?.error ? <p className="text-danger">{settleQ.data.error}</p> : null}
        </div>
      ) : null}
      {phase === "active" ? <Line done>Coverage active. Max loss is the premium.</Line> : null}
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
