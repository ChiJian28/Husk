"use client";

import { memo, useEffect, useRef, useState } from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { ArrowLeft, X } from "@phosphor-icons/react";
import { useAccount } from "wagmi";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { PolicyCard } from "@/components/policy/policy-card";
import { TxProgress } from "@/components/policy/tx-progress";
import { useBrokerFees, useCalendar, useCreateQuote, useQuote } from "@/hooks/useApi";
import { useBuyCoverage } from "@/hooks/useBuyCoverage";
import { DEMO_WALLET, isQuoteStale, quoteHasOpenRfq } from "@/lib/coverage";
import { ApiError } from "@/lib/errors";
import { cn } from "@/lib/utils";
import { useUi } from "@/stores/ui";
import type { Asset } from "@/lib/types";

export function PolicyPanel() {
  const { address, isConnected } = useAccount();
  const open = useUi((s) => s.policyOpen);
  const setOpen = useUi((s) => s.setPolicyOpen);
  const eventId = useUi((s) => s.selectedEventId);
  const quote = useUi((s) => s.quote);
  const plan = useUi((s) => s.plan);
  const setQuote = useUi((s) => s.setQuote);
  const buyPhase = useUi((s) => s.buyPhase);
  const buyError = useUi((s) => s.buyError);
  const asset = useUi((s) => s.knobs.asset);
  const maxDrawdownPct = useUi((s) => s.knobs.maxDrawdownPct);
  const coverageFraction = useUi((s) => s.knobs.coverageFraction);
  const maxPremiumUsdc = useUi((s) => s.knobs.maxPremiumUsdc);
  const allowStack = useUi((s) => s.knobs.allowStack);
  const calendar = useCalendar();
  const createQuote = useCreateQuote();
  const broker = useBrokerFees();
  const { buy, previewPlan, resumeOpenRfq } = useBuyCoverage();
  const storedQuote = useQuote(quote?.id, isConnected && !!quote?.id && buyPhase === "review");
  const readOnly = !isConnected;
  const quoteWallet = address ?? DEMO_WALLET;
  const [refreshing, setRefreshing] = useState(false);

  const event = calendar.data?.events.find((e) => e.id === eventId);

  useEffect(() => {
    if (!open || !eventId) return;
    let cancelled = false;
    const handle = window.setTimeout(async () => {
      const existing = useUi.getState().quote;
      const sameEvent = existing?.event.id === eventId;
      if (existing && sameEvent) setRefreshing(true);
      else {
        if (existing && !sameEvent) setQuote(null);
        useUi.getState().setBuy({ phase: "quoting", error: null, plan: null });
      }
      useUi.getState().setBuy({ plan: null, error: null });
      try {
        const res = await createQuote.mutateAsync({
          wallet: quoteWallet,
          eventId,
          asset,
          maxDrawdownPct,
          coverageFraction,
          maxPremiumUsdc,
          allowStack,
        });
        if (cancelled) return;
        setQuote(res.quote, "quoted");
        if (quoteHasOpenRfq(res.quote) && res.quote.existingCoverageId && isConnected) {
          useUi.getState().setBuy({
            phase: "rfq_waiting",
            coverageId: res.quote.existingCoverageId,
            error: "An RFQ is already open for this event.",
          });
          return;
        }
        useUi.getState().setBuy({ phase: "review" });
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiError && err.code === "OPEN_RFQ_EXISTS" && isConnected) {
          const resumed = await resumeOpenRfq(err.message);
          if (resumed) return;
        }
        useUi.getState().setBuy({
          phase: "error",
          error: err instanceof ApiError ? err.message : "Quote failed",
        });
      } finally {
        if (!cancelled) setRefreshing(false);
      }
    }, 280);
    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
    // Re-quote only after committed knob values change (sliders commit on release).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    open,
    eventId,
    quoteWallet,
    asset,
    maxDrawdownPct,
    coverageFraction,
    maxPremiumUsdc,
    allowStack,
  ]);

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

  useEffect(() => {
    const remote = storedQuote.data;
    if (!remote?.quote || !quote || remote.quote.id !== quote.id) return;
    if (remote.status === "rfq_open" && remote.quote.existingCoverageId) {
      useUi.getState().setBuy({ phase: "rfq_waiting", coverageId: remote.quote.existingCoverageId });
    }
  }, [quote, storedQuote.data]);

  if (!open) return null;

  const stale = quote ? isQuoteStale(quote.createdAt) : false;
  const busy = buyPhase === "planning" || buyPhase === "signing" || buyPhase === "verifying";
  const firstLoad = !quote && buyPhase !== "error";

  return (
    <aside
      className={cn(
        "flex min-h-0 flex-col border-line bg-raised",
        "fixed inset-0 z-overlay lg:static lg:z-auto lg:max-w-none lg:border-0",
      )}
    >
      <div className="flex items-center justify-between border-b border-line px-5 py-4">
        <button
          type="button"
          className="flex items-center gap-2 text-sm text-mute hover:text-ink lg:hidden"
          onClick={() => setOpen(false)}
        >
          <ArrowLeft className="size-4" />
          Calendar
        </button>
        <p className="text-sm font-medium">{readOnly ? "Demo policy" : "Policy"}</p>
        <button type="button" className="hidden rounded-pill p-1 text-mute hover:bg-sunken lg:block" onClick={() => setOpen(false)}>
          <X className="size-4" />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
        <p className="text-[13px] text-mute">{event?.name ?? "Selected event"}</p>
        <h2 className="mt-1 text-2xl font-semibold tracking-tight">Five facts, then you sign</h2>

        <Knobs />

        {firstLoad ? (
          <div className="mt-6 space-y-3">
            <Skeleton className="h-16 w-full rounded-card" />
            <Skeleton className="h-16 w-full rounded-card" />
            <Skeleton className="h-40 w-full rounded-card" />
          </div>
        ) : quote ? (
          <div className={cn("mt-6 space-y-5", refreshing && "opacity-70")}>
            {refreshing ? <p className="text-sm text-mute">Updating quote…</p> : null}
            {stale && !refreshing ? (
              <p className="text-sm text-naked">Quote is older than 90s. Buy will re-quote before you sign.</p>
            ) : null}
            {readOnly ? (
              <p className="text-sm text-mute">Read-only demo on the next live event. Connect a Base wallet to buy.</p>
            ) : null}
            <PolicyCard quote={quote} plan={readOnly ? null : plan} broker={broker.data} />
            <TxProgress />
            {readOnly ? (
              <ConnectButton.Custom>
                {({ openConnectModal }) => (
                  <Button size="lg" className="w-full" onClick={openConnectModal}>
                    Connect wallet
                  </Button>
                )}
              </ConnectButton.Custom>
            ) : (
              <Button
                size="lg"
                className="w-full"
                disabled={busy || refreshing || buyPhase === "rfq_waiting" || (!plan && buyPhase === "review")}
                onClick={() => buy(quote.id)}
              >
                {buyPhase === "active"
                  ? "Coverage active"
                  : buyPhase === "planning" || (!plan && buyPhase === "review")
                    ? "Encoding preview"
                    : buyPhase === "signing"
                      ? "Sign in wallet"
                      : "Buy coverage"}
              </Button>
            )}
          </div>
        ) : (
          <p className="mt-6 text-sm text-danger">{buyError ?? "No quote yet."}</p>
        )}
      </div>
    </aside>
  );
}

const Knobs = memo(function Knobs() {
  const knobs = useUi((s) => s.knobs);
  const setKnobs = useUi((s) => s.setKnobs);
  return (
    <div className="mt-5 grid gap-4 sm:grid-cols-2">
      <fieldset className="grid gap-1.5">
        <Label>Asset</Label>
        <div className="flex rounded-input border border-line p-0.5">
          {(["ETH", "BTC"] as Asset[]).map((a) => (
            <button
              key={a}
              type="button"
              onClick={() => setKnobs({ asset: a })}
              className={cn(
                "h-9 flex-1 rounded-[8px] text-sm",
                knobs.asset === a ? "bg-husk text-husk-fg" : "text-mute hover:text-ink",
              )}
            >
              {a === "BTC" ? "cbBTC" : "ETH"}
            </button>
          ))}
        </div>
      </fieldset>
      <CommitSlider
        id="prem"
        label="Max premium (USDC)"
        min={1}
        max={20}
        step={1}
        value={knobs.maxPremiumUsdc ?? 3}
        format={(v) => `${v} USDC`}
        onCommit={(maxPremiumUsdc) => setKnobs({ maxPremiumUsdc })}
      />
      <CommitSlider
        id="dd"
        label="Deductible"
        min={5}
        max={40}
        step={1}
        value={knobs.maxDrawdownPct ?? 10}
        format={(v) => `First ${v}% is yours`}
        onCommit={(maxDrawdownPct) => setKnobs({ maxDrawdownPct })}
      />
      <CommitSlider
        id="frac"
        label="Bag fraction"
        min={0.1}
        max={1}
        step={0.1}
        value={knobs.coverageFraction ?? 1}
        format={(v) => `${Math.round(v * 100)}%`}
        onCommit={(coverageFraction) => setKnobs({ coverageFraction })}
      />
      <label className="flex items-center gap-2 text-sm text-mute sm:col-span-2">
        <input
          type="checkbox"
          checked={!!knobs.allowStack}
          onChange={(e) => setKnobs({ allowStack: e.target.checked })}
        />
        Stack on top of an existing policy
      </label>
    </div>
  );
});

function CommitSlider({
  id,
  label,
  min,
  max,
  step,
  value,
  format,
  onCommit,
}: {
  id: string;
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  format: (v: number) => string;
  onCommit: (v: number) => void;
}) {
  const [local, setLocal] = useState(value);
  const dragging = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const valueRef = useRef(value);
  const onCommitRef = useRef(onCommit);
  const stepRef = useRef(step);
  valueRef.current = value;
  onCommitRef.current = onCommit;
  stepRef.current = step;

  useEffect(() => {
    if (!dragging.current) setLocal(value);
  }, [value]);

  const flush = (raw: string) => {
    const next = Number(raw);
    if (!Number.isFinite(next)) return;
    if (Math.abs(next - valueRef.current) < stepRef.current / 4) return;
    onCommitRef.current(next);
  };

  useEffect(() => {
    const endDrag = () => {
      if (!dragging.current) return;
      dragging.current = false;
      const el = inputRef.current;
      if (el) flush(el.value);
    };
    window.addEventListener("pointerup", endDrag);
    window.addEventListener("pointercancel", endDrag);
    return () => {
      window.removeEventListener("pointerup", endDrag);
      window.removeEventListener("pointercancel", endDrag);
    };
  }, []);

  return (
    <label className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <input
        ref={inputRef}
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={local}
        onPointerDown={() => {
          dragging.current = true;
        }}
        onMouseDown={() => {
          dragging.current = true;
        }}
        onTouchStart={() => {
          dragging.current = true;
        }}
        onChange={(e) => {
          const next = Number(e.target.value);
          setLocal(next);
          // Keyboard / AT: no pointer gesture, commit each step.
          if (!dragging.current) flush(e.target.value);
        }}
        className="accent-husk"
      />
      <span className="font-mono text-xs text-mute" data-numeric>
        {format(local)}
      </span>
    </label>
  );
}
