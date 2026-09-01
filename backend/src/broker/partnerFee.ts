/**
 * PartnerFeeBroker math — copied from Polynuts partnerBroker.ts.
 * Truncation order must match the on-chain broker or fills revert.
 */
export function computePartnerFee(usdcAmount: bigint, price: bigint, feeBps: bigint): bigint {
  if (price <= 0n || feeBps <= 0n) return 0n;
  const PRICE_DECIMALS = 10n ** 8n;
  const numContracts = (usdcAmount * PRICE_DECIMALS) / price;
  const premium = (price * numContracts) / PRICE_DECIMALS;
  return (premium * feeBps) / 10_000n;
}

export async function readBrokerFeeBps(
  provider: { call: unknown } | import('ethers').Provider,
  brokerAddress: string,
): Promise<bigint> {
  const { Contract } = await import('ethers');
  const broker = new Contract(brokerAddress, ['function feeBps() view returns (uint256)'], provider as import('ethers').Provider);
  return (await broker.feeBps()) as bigint;
}

export async function readAccumulatedFees(
  provider: import('ethers').Provider,
  brokerAddress: string,
  token: string,
): Promise<bigint> {
  const { Contract } = await import('ethers');
  const broker = new Contract(
    brokerAddress,
    ['function accumulatedFees(address) view returns (uint256)'],
    provider,
  );
  return (await broker.accumulatedFees(token)) as bigint;
}
