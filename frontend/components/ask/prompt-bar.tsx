"use client";

import { ArrowUp } from "@phosphor-icons/react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { HuskPromptMark } from "@/components/brand/husk-mascot";
import { useAskHuskChat } from "@/hooks/useAskHuskChat";
import { cn } from "@/lib/utils";
import { useUi } from "@/stores/ui";

export function DesktopPromptBar() {
  const chatOpen = useUi((s) => s.chatOpen);
  const { isConnected, draft, setDraft, send, turn } = useAskHuskChat();

  if (chatOpen) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-header hidden px-6 pb-6 lg:block">
      <div className="pointer-events-auto mx-auto max-w-3xl">
        <form
          className={cn(
            "flex items-center gap-3 rounded-pill border border-line bg-raised px-4 py-2.5 shadow-lift",
            "transition-[border-color,box-shadow] duration-200 ease-husk",
            "focus-within:border-husk focus-within:shadow-husk",
          )}
          onSubmit={(e) => {
            e.preventDefault();
            void send(draft);
          }}
        >
          <HuskPromptMark size={32} />
          {!isConnected ? (
            <div className="flex flex-1 items-center justify-between gap-3 py-1">
              <span className="text-sm text-mute">Connect wallet to ask the underwriter…</span>
              <ConnectButton />
            </div>
          ) : (
            <>
              <input
                type="text"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Ask Husk about coverage, events, premiums…"
                className="prompt-bar-input min-w-0 flex-1 border-0 bg-transparent text-sm text-ink placeholder:text-mute/70 shadow-none ring-0"
                maxLength={2000}
              />
              <button
                type="submit"
                disabled={!draft.trim() || turn.isPending}
                aria-label="Send"
                className={cn(
                  "flex size-9 shrink-0 items-center justify-center rounded-full bg-husk text-husk-fg",
                  "transition-[transform,opacity] duration-200 ease-husk",
                  "hover:brightness-110 disabled:opacity-40",
                )}
              >
                <ArrowUp className="size-4" weight="bold" />
              </button>
            </>
          )}
        </form>
      </div>
    </div>
  );
}
