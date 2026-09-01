"use client";

import { ArrowUp, X } from "@phosphor-icons/react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { HuskMascot, HuskPromptMark } from "@/components/brand/husk-mascot";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { PolicyCard } from "@/components/policy/policy-card";
import { TxProgress } from "@/components/policy/tx-progress";
import { ASK_STARTERS, useAskHuskChat } from "@/hooks/useAskHuskChat";
import { useBrokerFees } from "@/hooks/useApi";
import { cn } from "@/lib/utils";
import { useUi } from "@/stores/ui";

type AskHuskProps = {
  variant?: "page" | "panel";
};

export function AskHusk({ variant = "page" }: AskHuskProps) {
  const isPanel = variant === "panel";
  const setChatOpen = useUi((s) => s.setChatOpen);
  const { isConnected, draft, setDraft, messages, quote, plan, buyPhase, turn, buy, send } =
    useAskHuskChat();
  const broker = useBrokerFees();

  if (isPanel) {
    return (
      <aside className="flex h-full min-h-0 w-[min(28rem,38vw)] shrink-0 flex-col border-l border-line bg-raised">
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-line px-5 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <HuskPromptMark size={36} className="shrink-0" />
            <div className="min-w-0">
              <h2 className="text-[15px] font-semibold tracking-tight">Ask Husk</h2>
              <p className="truncate text-[12px] text-mute">Event coverage underwriter</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setChatOpen(false)}
            className="flex size-8 shrink-0 items-center justify-center rounded-input text-mute transition-colors hover:bg-sunken hover:text-ink"
            aria-label="Close chat"
          >
            <X className="size-4" />
          </button>
        </header>

        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5 no-scrollbar">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center pt-6 text-center">
                <HuskPromptMark size={140} rounded="card" className="mb-4" />
                <h3 className="text-lg font-semibold tracking-tight">Hi, I&apos;m Husk</h3>
                <p className="mt-2 max-w-[28ch] text-sm leading-relaxed text-mute">
                  Ask about coverage, event risk, premiums, or why a quote was structured the way it was.
                </p>
                <div className="mt-6 flex w-full flex-col gap-2">
                  {ASK_STARTERS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      disabled={!isConnected}
                      onClick={() => void send(s)}
                      className="rounded-pill border border-line bg-canvas px-4 py-2.5 text-left text-sm text-ink transition-colors hover:border-husk disabled:opacity-40"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((m) => (
                <article
                  key={m.id}
                  className={cn(
                    "max-w-full rounded-card px-4 py-3 text-sm leading-relaxed",
                    m.role === "user" ? "ml-auto bg-husk text-husk-fg" : "border border-line bg-canvas",
                    m.refusal && "border-danger/40",
                  )}
                >
                  {m.text}
                </article>
              ))
            )}

            {quote && messages.some((m) => m.quoteId === quote.id) ? (
              <div className="space-y-4 rounded-card border border-line bg-canvas p-4">
                <PolicyCard quote={quote} plan={plan} broker={broker.data} />
                <TxProgress />
                <Button
                  disabled={
                    !isConnected ||
                    buyPhase === "planning" ||
                    buyPhase === "signing" ||
                    buyPhase === "verifying" ||
                    buyPhase === "rfq_waiting" ||
                    (!plan && buyPhase === "review")
                  }
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
              </div>
            ) : null}

            {turn.isPending ? <p className="text-sm text-mute">Underwriting…</p> : null}
          </div>

          <div className="shrink-0 border-t border-line px-5 py-4">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void send(draft);
              }}
            >
              {!isConnected ? (
                <ConnectButton />
              ) : (
                <div
                  className={cn(
                    "relative rounded-card border border-line bg-canvas p-3",
                    "transition-[border-color,box-shadow] duration-200 ease-husk",
                    "focus-within:border-husk focus-within:shadow-husk",
                  )}
                >
                  <Textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        void send(draft);
                      }
                    }}
                    placeholder="Ask Husk…"
                    rows={3}
                    className="husk-bare-input min-h-[72px] resize-none rounded-none border-0 bg-transparent p-0 pr-12 shadow-none ring-0 focus-visible:border-transparent"
                    maxLength={2000}
                  />
                  <button
                    type="submit"
                    disabled={!draft.trim() || turn.isPending}
                    aria-label="Send"
                    className={cn(
                      "absolute bottom-3 right-3 flex size-9 items-center justify-center rounded-full bg-husk text-husk-fg",
                      "transition-[transform,opacity] duration-200 ease-husk hover:brightness-110 disabled:opacity-40",
                    )}
                  >
                    <ArrowUp className="size-4" weight="bold" />
                  </button>
                </div>
              )}
            </form>
            <p className="mt-2 text-center text-[11px] text-mute">
              Answers may contain mistakes · Enter to send
            </p>
          </div>
        </div>
      </aside>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col lg:grid lg:grid-cols-[minmax(16rem,22rem)_minmax(0,1fr)]">
      <section className="hidden flex-col justify-between border-r border-line px-8 py-8 lg:flex">
        <div>
          <p className="text-[13px] text-mute">Third entry</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight leading-[1.12]">
            Ask the underwriter
          </h1>
          <p className="mt-4 max-w-[36ch] text-sm leading-relaxed text-mute">
            Same engine as the calendar. It only writes long puts or put spreads. Calls get refused.
          </p>
        </div>
        <HuskMascot mood={quote ? "approaching" : "normal"} size={220} />
      </section>

      <section className="flex min-h-[calc(100dvh-8rem)] flex-col px-4 py-6 lg:min-h-[100dvh] lg:px-10 lg:py-8">
        <div className="lg:hidden mb-4">
          <h1 className="text-2xl font-semibold tracking-tight">Ask Husk</h1>
          <p className="mt-1 text-sm text-mute">The underwriter, not a trading bot.</p>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto no-scrollbar">
          {messages.length === 0 ? (
            <div className="flex flex-col gap-2 pt-4">
              {ASK_STARTERS.map((s) => (
                <button
                  key={s}
                  type="button"
                  disabled={!isConnected}
                  onClick={() => void send(s)}
                  className="rounded-card border border-line bg-raised px-4 py-3 text-left text-sm text-ink hover:border-husk disabled:opacity-40"
                >
                  {s}
                </button>
              ))}
            </div>
          ) : (
            messages.map((m) => (
              <article
                key={m.id}
                className={cn(
                  "max-w-[42rem] rounded-card px-4 py-3 text-sm leading-relaxed",
                  m.role === "user" ? "ml-auto bg-husk text-husk-fg" : "bg-raised border border-line",
                  m.refusal && "border-danger/40",
                )}
              >
                {m.text}
              </article>
            ))
          )}

          {quote && messages.some((m) => m.quoteId === quote.id) ? (
            <div className="max-w-[42rem] rounded-card border border-line bg-raised p-4 space-y-4">
              <PolicyCard quote={quote} plan={plan} broker={broker.data} />
              <TxProgress />
              <Button
                disabled={
                  !isConnected ||
                  buyPhase === "planning" ||
                  buyPhase === "signing" ||
                  buyPhase === "verifying" ||
                  buyPhase === "rfq_waiting" ||
                  (!plan && buyPhase === "review")
                }
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
            </div>
          ) : null}

          {turn.isPending ? <p className="text-sm text-mute">Underwriting…</p> : null}
        </div>

        <form
          className="mt-4 flex items-end gap-2 border-t border-line pt-4"
          onSubmit={(e) => {
            e.preventDefault();
            void send(draft);
          }}
        >
          {!isConnected ? (
            <ConnectButton />
          ) : (
            <>
              <Textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Cover my ETH through Friday…"
                rows={2}
                className="min-h-[52px]"
                maxLength={2000}
              />
              <Button type="submit" size="icon" disabled={!draft.trim() || turn.isPending} aria-label="Send">
                <ArrowUp className="size-4" weight="bold" />
              </Button>
            </>
          )}
        </form>
      </section>
    </div>
  );
}
