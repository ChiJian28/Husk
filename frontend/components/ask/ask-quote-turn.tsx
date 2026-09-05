"use client";

import { ChatMessage } from "@/components/ask/chat-message";
import { AskQuoteOffer } from "@/components/ask/ask-quote-offer";
import type { BuyPhase } from "@/stores/ui";
import type { ExecutionPlan, PolicyQuote } from "@/lib/types";
import type { ChatMsg } from "@/stores/ui";

type AskQuoteTurnProps = {
  message: ChatMsg;
  quote: PolicyQuote;
  plan?: ExecutionPlan | null;
  buyPhase: BuyPhase;
  isConnected: boolean;
  onSign: () => void;
};

export function AskQuoteTurn({
  message,
  quote,
  plan,
  buyPhase,
  isConnected,
  onSign,
}: AskQuoteTurnProps) {
  return (
    <div className="space-y-3">
      <ChatMessage message={message} />
      <AskQuoteOffer
        quote={quote}
        plan={plan}
        buyPhase={buyPhase}
        isConnected={isConnected}
        onSign={onSign}
      />
    </div>
  );
}
