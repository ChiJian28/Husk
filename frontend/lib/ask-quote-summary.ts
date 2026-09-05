import type { BuyPhase } from "@/stores/ui";
import { formatAsset, formatPct, formatUsdc, formatUtc } from "@/lib/format";
import type { PolicyQuote } from "@/lib/types";

/** Human summary for Ask Husk — no field names, calldata, or quote ids. */
export function formatAskQuoteSummary(quote: PolicyQuote): string {
  const symbol = quote.intent.asset === "BTC" ? "cbBTC" : "ETH";
  const bag = formatAsset(quote.bag.protectedNotionalAsset, symbol);
  const route =
    quote.route === "RFQ"
      ? "RFQ route — a market maker must answer within ~15 minutes."
      : "OptionBook — instant fill if liquidity matches.";

  return [
    `I'll cover your ${bag} through ${quote.event.name}.`,
    `You pay up to ${formatUsdc(quote.totalDebitUsdc)} USDC (max loss). If price dumps past the ${formatPct(quote.deductiblePct)} floor, payout up to ${formatUsdc(quote.maxPayoutUsdc)}.`,
    `Expires ${formatUtc(quote.expiryIso)} · ${quote.copy.settlement}. ${route}`,
  ].join(" ");
}

export function askSignLabel(phase: BuyPhase, hasPlan: boolean): string {
  if (phase === "active") return "Coverage active";
  if (phase === "planning" || (!hasPlan && phase === "review")) return "Preparing to sign…";
  if (phase === "signing") return "Sign in wallet";
  if (phase === "verifying") return "Verifying on Base…";
  if (phase === "rfq_waiting") return "RFQ open on-chain";
  return "Review & sign";
}

export function askSignDisabled(isConnected: boolean, buyPhase: BuyPhase, hasPlan: boolean): boolean {
  return (
    !isConnected ||
    buyPhase === "planning" ||
    buyPhase === "signing" ||
    buyPhase === "verifying" ||
    buyPhase === "rfq_waiting" ||
    buyPhase === "active" ||
    (!hasPlan && buyPhase === "review")
  );
}
