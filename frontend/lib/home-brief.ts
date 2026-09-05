import type { CalendarEvent, CoverageRow } from "@/lib/types";
import { countdownTo, formatPct, formatUnix } from "@/lib/format";
import { isExpiringSoon } from "@/lib/coverage";

export type HomeBriefInput = {
  connected: boolean;
  walletLabel?: string;
  live: CoverageRow | null;
  nextEvent?: CalendarEvent;
  coveragePctEth?: number;
  nakedUsd?: number | null;
  bagUsd?: number | null;
  rollingSoon?: boolean;
  now?: number;
};

export type HomeBrief = {
  kicker: string;
  greeting: string;
  summary: string;
};

function timeGreeting(now = new Date()) {
  const h = now.getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function shortWallet(address: string) {
  return `${address.slice(0, 6)}....${address.slice(-4)}`;
}

export function buildHomeBrief(input: HomeBriefInput): HomeBrief {
  const now = input.now ?? Date.now();
  const greeting = `${timeGreeting(new Date(now))}${input.connected && input.walletLabel ? `, ${shortWallet(input.walletLabel)}` : ""}.`;

  if (!input.connected) {
    const next = input.nextEvent;
    return {
      kicker: "Event shelf · read-only",
      greeting,
      summary: next
        ? `${next.name} is the next macro print on the shelf (${countdownTo(next.tsUtc)} out). Connect a Base wallet to see whether your bag is covered and price a put spread.`
        : "Connect a Base wallet to see holdings, active coverage, and live quotes against the event shelf.",
    };
  }

  const next = input.nextEvent;
  const nextLine = next ? `${next.name} (${countdownTo(next.tsUtc)})` : "the next shelf event";

  if (input.live?.status === "awaiting_signature") {
    return {
      kicker: "Action needed",
      greeting,
      summary: `Settlement calldata is ready for ${input.live.event_id ? "your open RFQ" : "coverage"}. Sign once to lock the floor before ${nextLine}.`,
    };
  }

  if (input.live?.status === "rfq_open") {
    return {
      kicker: "RFQ in flight",
      greeting,
      summary: `A maker offer is still pending on-chain. Nothing else is waiting on you right now. ${next ? `After it settles, ${nextLine} is the natural roll target.` : ""}`.trim(),
    };
  }

  if (input.live?.status === "active") {
    if (input.rollingSoon) {
      return {
        kicker: "Roll window open",
        greeting,
        summary: `Coverage expires ${formatUnix(input.live.expiry_unix)}. ${next ? `${nextLine} is up next — renew before settlement if you want continuity through the print.` : "Pick the next event on the shelf to extend."}`,
      };
    }
    const pct =
      input.coveragePctEth != null ? `${formatPct(input.coveragePctEth)} of your ETH bag is floored` : "You have active coverage";
    return {
      kicker: "Coverage active",
      greeting,
      summary: `${pct} through ${formatUnix(input.live.expiry_unix)}. ${next ? `${nextLine} is the headline event ahead.` : "Browse the shelf when you want to extend."}`,
    };
  }

  const naked =
    input.nakedUsd != null && input.nakedUsd > 0
      ? `$${Math.round(input.nakedUsd).toLocaleString("en-US")} of spot bag is naked`
      : input.coveragePctEth != null && input.coveragePctEth < 100
        ? `${formatPct(100 - input.coveragePctEth)} of your ETH bag is uncovered`
        : "Your bag has no active floor";

  return {
    kicker: "Uncovered",
    greeting,
    summary: `${naked}. ${next ? `${nextLine} is the next print worth hedging — open it on the shelf to quote a defined-risk put spread.` : "Add a custom window or wait for the next official event."}`,
  };
}

export function briefRollingSoon(live: CoverageRow | null, now = Date.now()) {
  return !!(live && live.status === "active" && isExpiringSoon(live.expiry_unix, now));
}
