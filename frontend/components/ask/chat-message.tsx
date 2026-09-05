"use client";

import { HuskPromptMark } from "@/components/brand/husk-mascot";
import { OFF_TOPIC_EMAIL } from "@/lib/ask-topic";
import { cn } from "@/lib/utils";
import type { ChatMsg } from "@/stores/ui";

function OffTopicBody() {
  return (
    <div className="space-y-2">
      <p>My energy&apos;s used up — I can&apos;t answer any more.</p>
      <p>
        Please contact my boss:
        <br />
        <a
          href={`mailto:${OFF_TOPIC_EMAIL}`}
          className="font-medium text-husk underline-offset-2 hover:underline"
        >
          {OFF_TOPIC_EMAIL}
        </a>
      </p>
    </div>
  );
}

export function ChatMessage({ message, className }: { message: ChatMsg; className?: string }) {
  if (message.role === "user") {
    return (
      <article
        className={cn(
          "ml-auto w-fit max-w-[85%] rounded-card bg-husk px-4 py-3 text-sm leading-relaxed text-husk-fg whitespace-pre-wrap",
          className,
        )}
      >
        {message.text}
      </article>
    );
  }

  return (
    <div className={cn("flex w-full items-start gap-3", className)}>
      <HuskPromptMark size={40} rounded="full" className="mt-0.5 shrink-0" />
      <article
        className={cn(
          "w-fit max-w-[calc(100%-3rem)] rounded-card border border-line bg-canvas px-4 py-3 text-sm leading-relaxed text-ink whitespace-pre-wrap",
          message.refusal && !message.offTopic && "border-danger/40",
        )}
      >
        {message.offTopic ? <OffTopicBody /> : message.text}
      </article>
    </div>
  );
}

export function ChatPending() {
  return (
    <div className="flex w-full items-start gap-3">
      <HuskPromptMark size={40} rounded="full" className="mt-0.5 shrink-0" />
      <p className="w-fit rounded-card border border-line bg-canvas px-4 py-3 text-sm text-mute">Underwriting…</p>
    </div>
  );
}
