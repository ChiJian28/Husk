export function policyUserSentence(q: {
  event: { name: string };
  totalDebitUsdc: string;
  maxPayoutUsdc: string;
  expiryIso: string;
}): string {
  return `Coverage for ${q.event.name}: you pay ${q.totalDebitUsdc} USDC (max loss). If the bag is down through the floor, max payout is ${q.maxPayoutUsdc} USDC at the next Chainlink TWAP settlement (${q.expiryIso}). If it is not, the premium is spent.`;
}
