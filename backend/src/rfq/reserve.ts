/** Early-settle only if the maker's offer is at or under our RFQ reserve. */
export function offerWithinReserve(offerAmount: bigint, reserveAmount: bigint): boolean {
  return offerAmount <= reserveAmount;
}

export function pickFirstOfferWithinReserve<T extends { offerAmount: bigint; offeror: string }>(
  offers: T[],
  reserveAmount: bigint,
): { accepted: T | undefined; rejected: T[] } {
  const rejected: T[] = [];
  for (const o of offers) {
    if (offerWithinReserve(o.offerAmount, reserveAmount)) return { accepted: o, rejected };
    rejected.push(o);
  }
  return { accepted: undefined, rejected };
}
