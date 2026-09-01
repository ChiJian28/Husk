"use client";

import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { useAgentTurn } from "@/hooks/useApi";
import { useBuyCoverage } from "@/hooks/useBuyCoverage";
import { quoteHasOpenRfq } from "@/lib/coverage";
import { ApiError } from "@/lib/errors";
import { useUi } from "@/stores/ui";

export const ASK_STARTERS = [
  "Cover this bag through the next settlement, don't spend more than 3 USDC.",
  "Don't let me lose more than 10% into the next print.",
  "I have a meeting Thursday. Just cover me.",
];

export function useAskHuskChat() {
  const { address, isConnected } = useAccount();
  const [draft, setDraft] = useState("");
  const messages = useUi((s) => s.messages);
  const push = useUi((s) => s.pushMessage);
  const threadId = useUi((s) => s.threadId);
  const setThreadId = useUi((s) => s.setThreadId);
  const setQuote = useUi((s) => s.setQuote);
  const quote = useUi((s) => s.quote);
  const plan = useUi((s) => s.plan);
  const buyPhase = useUi((s) => s.buyPhase);
  const setChatOpen = useUi((s) => s.setChatOpen);
  const turn = useAgentTurn();
  const { buy, previewPlan } = useBuyCoverage();

  const send = async (text: string) => {
    const utterance = text.trim();
    if (!utterance || !address) return;
    setChatOpen(true);
    push({ id: crypto.randomUUID(), role: "user", text: utterance });
    setDraft("");
    try {
      const res = await turn.mutateAsync({
        wallet: address,
        utterance,
        threadId: threadId ?? address,
      });
      setThreadId(threadId ?? address);
      if (res.refusal) {
        push({ id: crypto.randomUUID(), role: "husk", text: res.refusal, refusal: true });
        return;
      }
      if (res.quote) {
        setQuote(res.quote, "quoted");
        useUi.getState().setBuy({
          phase: quoteHasOpenRfq(res.quote) && res.quote.existingCoverageId ? "rfq_waiting" : "review",
          coverageId: res.quote.existingCoverageId ?? null,
          plan: res.plan ?? null,
        });
        push({
          id: crypto.randomUUID(),
          role: "husk",
          text: res.userSentence ?? res.quote.copy.userSentence,
          quoteId: res.quote.id,
        });
        if (res.clarify && quoteHasOpenRfq(res.quote)) return;
        if (res.clarify) {
          push({ id: crypto.randomUUID(), role: "husk", text: res.clarify });
        }
        return;
      }
      if (res.clarify) {
        push({ id: crypto.randomUUID(), role: "husk", text: res.clarify });
        return;
      }
      push({
        id: crypto.randomUUID(),
        role: "husk",
        text: res.userSentence ?? "I need a bit more to underwrite that.",
      });
    } catch (err) {
      push({
        id: crypto.randomUUID(),
        role: "husk",
        text: err instanceof ApiError ? err.message : "Underwriter is offline.",
        refusal: true,
      });
    }
  };

  useEffect(() => {
    if (!isConnected || !quote || buyPhase !== "review") return;
    if (quoteHasOpenRfq(quote)) return;
    if (plan?.quoteId === quote.id) return;
    void previewPlan(quote).catch((err) => {
      useUi.getState().setBuy({
        phase: "error",
        error: err instanceof Error ? err.message : "Preview failed",
      });
    });
  }, [buyPhase, isConnected, plan?.quoteId, previewPlan, quote]);

  return {
    address,
    isConnected,
    draft,
    setDraft,
    messages,
    quote,
    plan,
    buyPhase,
    turn,
    buy,
    send,
  };
}
