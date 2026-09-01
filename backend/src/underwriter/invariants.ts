export function assertDebitIsMaxLoss(q: { totalDebitUsdc: string; maxLossUsdc: string }): void {
  if (q.maxLossUsdc !== q.totalDebitUsdc) {
    throw new Error(`invariant: maxLossUsdc (${q.maxLossUsdc}) !== totalDebitUsdc (${q.totalDebitUsdc})`);
  }
}
