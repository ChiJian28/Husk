"use client";

import { useCallback } from "react";
import { useAccount, usePublicClient, useSendTransaction, useSwitchChain } from "wagmi";
import { base } from "wagmi/chains";
import { huskApi } from "@/lib/api";
import {
  bookApproveDrift,
  isQuoteStale,
  parseCoverageIdFromMessage,
  quoteHasOpenRfq,
} from "@/lib/coverage";
import { ApiError } from "@/lib/errors";
import { weiToBigint } from "@/lib/tx";
import { useCoverages } from "@/hooks/useApi";
import { useUi } from "@/stores/ui";
import type { Address, ExecutionPlan, PolicyQuote, UnsignedCall } from "@/lib/types";

function isStateChanging(call: UnsignedCall) {
  const d = call.description.toLowerCase();
  return !d.includes("approve");
}

export function useBuyCoverage() {
  const { address, chainId } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const { sendTransactionAsync } = useSendTransaction();
  const publicClient = usePublicClient({ chainId: base.id });
  const coverages = useCoverages(address);
  const setBuy = useUi((s) => s.setBuy);
  const resetBuy = useUi((s) => s.resetBuy);

  const sendCall = useCallback(
    async (call: UnsignedCall, index: number, total: number) => {
      setBuy({
        phase: "signing",
        error: null,
        signStep: { index, total, description: call.description },
      });
      const hash = await sendTransactionAsync({
        to: call.to,
        data: call.data,
        value: weiToBigint(call.value),
        chainId: base.id,
      });
      setBuy({
        phase: "signing",
        lastTxHash: hash,
        signStep: { index, total, description: "Waiting for confirmation" },
      });
      if (!publicClient) {
        throw new Error("No Base RPC client. Cannot wait for the receipt.");
      }
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      if (receipt.status === "reverted") {
        throw new Error("Transaction reverted on Base.");
      }
      return hash;
    },
    [publicClient, sendTransactionAsync, setBuy],
  );

  const ensureChain = useCallback(async () => {
    if (chainId !== base.id) {
      await switchChainAsync({ chainId: base.id });
    }
  }, [chainId, switchChainAsync]);

  const resumeOpenRfq = useCallback(
    async (hint?: string | null) => {
      if (!address) return false;
      const fromMsg = hint ? parseCoverageIdFromMessage(hint) : null;
      const list = await huskApi.coverages(address as Address);
      const open = list.coverages.find((c) => c.status === "rfq_open" || c.status === "awaiting_signature");
      const coverageId = fromMsg ?? open?.id ?? null;
      if (!coverageId) return false;
      setBuy({ phase: "rfq_waiting", coverageId, error: hint ?? null, plan: null });
      void coverages.refetch();
      return true;
    },
    [address, coverages, setBuy],
  );

  const previewPlan = useCallback(
    async (quote: PolicyQuote): Promise<ExecutionPlan | null> => {
      if (quoteHasOpenRfq(quote) && quote.existingCoverageId) {
        setBuy({
          phase: "rfq_waiting",
          coverageId: quote.existingCoverageId,
          error: "An RFQ is already open. Sign the settle when the maker offers.",
        });
        return null;
      }
      setBuy({ phase: "planning", error: null });
      try {
        const { plan } = await huskApi.plan(quote.id);
        setBuy({ plan, phase: "review" });
        return plan;
      } catch (err) {
        if (err instanceof ApiError && err.code === "OPEN_RFQ_EXISTS") {
          const resumed = await resumeOpenRfq(err.message);
          if (resumed) return null;
        }
        throw err;
      }
    },
    [resumeOpenRfq, setBuy],
  );

  const buy = useCallback(
    async (quoteId: string) => {
      if (!address) {
        setBuy({ phase: "error", error: "Connect a Base wallet first." });
        return;
      }
      try {
        await ensureChain();
        let quote = useUi.getState().quote;
        if (!quote || quote.id !== quoteId) {
          const remote = await huskApi.getQuote(quoteId);
          quote = remote.quote;
          useUi.getState().setQuote(quote, remote.status);
        } else if (isQuoteStale(quote.createdAt)) {
          setBuy({ phase: "quoting", error: null, plan: null });
          const res = await huskApi.quote(quote.intent);
          quote = res.quote;
          useUi.getState().setQuote(quote, "quoted");
        } else {
          const remote = await huskApi.getQuote(quoteId);
          if (remote.status === "rfq_open") {
            await resumeOpenRfq(remote.quote.existingCoverageId);
            return;
          }
          if (remote.status === "active") {
            setBuy({ phase: "active" });
            return;
          }
          quote = remote.quote;
        }

        if (quoteHasOpenRfq(quote)) {
          const resumed = await resumeOpenRfq(quote.existingCoverageId ?? null);
          if (!resumed) {
            setBuy({
              phase: "error",
              error: "An RFQ is already open. Open Positions to sign the settle.",
            });
          }
          return;
        }

        let plan = useUi.getState().plan;
        const hadLockedPlan = !!plan && plan.quoteId === quote.id;
        if (!plan || plan.quoteId !== quote.id) {
          plan = await previewPlan(quote);
        }
        if (!plan) return;

        const drift = bookApproveDrift(quote, plan);
        if (drift > 0.05) {
          setBuy({ phase: "quoting", error: null, plan: null });
          const res = await huskApi.quote(quote.intent);
          quote = res.quote;
          useUi.getState().setQuote(quote, "quoted");
          plan = await previewPlan(quote);
          if (!plan) return;
          if (bookApproveDrift(quote, plan) > 0.05) {
            setBuy({
              phase: "error",
              error: "Preview no longer matches the quote. Re-open the event to get a fresh price.",
            });
            return;
          }
          setBuy({ phase: "review", plan });
          return;
        }

        if (!hadLockedPlan) {
          setBuy({ phase: "review", plan });
          return;
        }

        const total = plan.calls.length;
        if (total === 0) {
          setBuy({ phase: "error", error: "Plan returned no calls." });
          return;
        }
        let lastHash: `0x${string}` | null = null;
        for (let i = 0; i < plan.calls.length; i++) {
          const call = plan.calls[i];
          const hash = await sendCall(call, i + 1, total);
          lastHash = hash;
          if (isStateChanging(call)) {
            setBuy({ phase: "verifying", lastTxHash: hash });
            const verified = await huskApi.verify({
              txHash: hash,
              quoteId: quote.id,
              wallet: address as Address,
            });
            setBuy({ coverageId: verified.coverageId });
            if (verified.verification.kind === "rfq_requested") {
              setBuy({ phase: "rfq_waiting" });
              void coverages.refetch();
              return;
            }
            setBuy({ phase: "active" });
            void coverages.refetch();
            return;
          }
        }
        if (lastHash) {
          setBuy({ phase: "verifying", lastTxHash: lastHash });
          const verified = await huskApi.verify({
            txHash: lastHash,
            quoteId: quote.id,
            wallet: address as Address,
          });
          if (verified.verification.kind === "rfq_requested") {
            setBuy({ phase: "rfq_waiting", coverageId: verified.coverageId });
            return;
          }
          setBuy({ phase: "active", coverageId: verified.coverageId });
        }
        void coverages.refetch();
      } catch (err) {
        if (err instanceof ApiError && err.code === "OPEN_RFQ_EXISTS") {
          const resumed = await resumeOpenRfq(err.message);
          if (resumed) return;
        }
        if (err instanceof ApiError && err.code === "ALREADY_COVERED") {
          setBuy({
            phase: "error",
            error: "An overlapping policy is already active. Turn on stack, then quote again.",
          });
          return;
        }
        const message = err instanceof Error ? err.message : "Transaction failed";
        setBuy({ phase: "error", error: message });
      }
    },
    [address, coverages, ensureChain, previewPlan, resumeOpenRfq, sendCall, setBuy],
  );

  const settle = useCallback(
    async (quoteId: string, call: UnsignedCall) => {
      if (!address) return;
      try {
        await ensureChain();
        const hash = await sendCall(call, 1, 1);
        setBuy({ phase: "verifying", lastTxHash: hash });
        const verified = await huskApi.verify({
          txHash: hash,
          quoteId,
          wallet: address as Address,
        });
        setBuy({
          phase: verified.status === "active" ? "active" : "rfq_waiting",
          coverageId: verified.coverageId,
        });
        void coverages.refetch();
      } catch (err) {
        setBuy({
          phase: "error",
          error: err instanceof Error ? err.message : "Settle failed",
        });
      }
    },
    [address, coverages, ensureChain, sendCall, setBuy],
  );

  return { buy, settle, previewPlan, resumeOpenRfq, resetBuy };
}
