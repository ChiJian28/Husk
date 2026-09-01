import { create } from "zustand";
import type { CoverageIntent, ExecutionPlan, PolicyQuote, QuoteStatus, UnsignedCall } from "@/lib/types";

export type BuyPhase =
  | "idle"
  | "quoting"
  | "review"
  | "planning"
  | "signing"
  | "verifying"
  | "rfq_waiting"
  | "settle_ready"
  | "active"
  | "error";

export type ChatMsg = {
  id: string;
  role: "user" | "husk";
  text: string;
  quoteId?: string;
  refusal?: boolean;
};

type IntentKnobs = Pick<
  CoverageIntent,
  "asset" | "maxDrawdownPct" | "coverageFraction" | "maxPremiumUsdc" | "allowStack"
>;

type UiState = {
  knobs: IntentKnobs;
  selectedEventId: string | null;
  quote: PolicyQuote | null;
  quoteStatus: QuoteStatus | null;
  policyOpen: boolean;
  buyPhase: BuyPhase;
  buyError: string | null;
  signStep: { index: number; total: number; description: string } | null;
  coverageId: string | null;
  settleCall: UnsignedCall | null;
  lastTxHash: `0x${string}` | null;
  plan: ExecutionPlan | null;
  demoNowOffsetMs: number;
  threadId: string | null;
  messages: ChatMsg[];
  customOpen: boolean;
  chatOpen: boolean;
  setKnobs: (patch: Partial<IntentKnobs>) => void;
  selectEvent: (id: string | null) => void;
  setQuote: (quote: PolicyQuote | null, status?: QuoteStatus | null) => void;
  setPolicyOpen: (open: boolean) => void;
  setBuy: (patch: {
    phase?: BuyPhase;
    error?: string | null;
    signStep?: UiState["signStep"];
    coverageId?: string | null;
    settleCall?: UnsignedCall | null;
    lastTxHash?: `0x${string}` | null;
    plan?: ExecutionPlan | null;
  }) => void;
  resetBuy: () => void;
  setDemoNowOffsetMs: (ms: number) => void;
  setThreadId: (id: string | null) => void;
  pushMessage: (msg: ChatMsg) => void;
  setCustomOpen: (open: boolean) => void;
  setChatOpen: (open: boolean) => void;
};

export const useUi = create<UiState>((set) => ({
  knobs: {
    asset: "ETH",
    maxDrawdownPct: 10,
    coverageFraction: 1,
    maxPremiumUsdc: 3,
    allowStack: false,
  },
  selectedEventId: null,
  quote: null,
  quoteStatus: null,
  policyOpen: false,
  buyPhase: "idle",
  buyError: null,
  signStep: null,
  coverageId: null,
  settleCall: null,
  lastTxHash: null,
  plan: null,
  demoNowOffsetMs: 0,
  threadId: null,
  messages: [],
  customOpen: false,
  chatOpen: false,
  setKnobs: (patch) => set((s) => ({ knobs: { ...s.knobs, ...patch } })),
  selectEvent: (id) => set({ selectedEventId: id }),
  setQuote: (quote, status = quote ? "quoted" : null) =>
    set((s) => ({
      quote,
      quoteStatus: status ?? null,
      plan: quote && s.plan?.quoteId === quote.id ? s.plan : quote ? null : s.plan,
    })),
  setPolicyOpen: (open) => set({ policyOpen: open, ...(open ? {} : { selectedEventId: null }) }),
  setBuy: (patch) =>
    set((s) => ({
      buyPhase: patch.phase ?? s.buyPhase,
      buyError: patch.error === undefined ? s.buyError : patch.error,
      signStep: patch.signStep === undefined ? s.signStep : patch.signStep,
      coverageId: patch.coverageId === undefined ? s.coverageId : patch.coverageId,
      settleCall: patch.settleCall === undefined ? s.settleCall : patch.settleCall,
      lastTxHash: patch.lastTxHash === undefined ? s.lastTxHash : patch.lastTxHash,
      plan: patch.plan === undefined ? s.plan : patch.plan,
    })),
  resetBuy: () =>
    set({
      buyPhase: "idle",
      buyError: null,
      signStep: null,
      coverageId: null,
      settleCall: null,
      lastTxHash: null,
      plan: null,
    }),
  setDemoNowOffsetMs: (ms) => set({ demoNowOffsetMs: ms }),
  setThreadId: (id) => set({ threadId: id }),
  pushMessage: (msg) => set((s) => ({ messages: [...s.messages, msg] })),
  setCustomOpen: (open) => set({ customOpen: open }),
  setChatOpen: (open) => set({ chatOpen: open }),
}));
