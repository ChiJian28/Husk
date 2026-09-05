import { toBigInt } from "ethers";

/** DecimalString wei from the API → bigint for wagmi. Never JSON-number USDC. */
export function weiToBigint(value: string): bigint {
  if (!value || value === "0") return BigInt(0);
  return toBigInt(value);
}

/** EIP-7825 / Base Azul per-tx cap (2^24). Infura currently rejects above 25M. */
export const BASE_TX_GAS_CAP = 16_777_216n;

/**
 * Wallets on Infura often fill `gas` with a stale block gasLimit (~140M) when
 * estimate is flaky. Base then rejects the raw tx. RFQ/book fills need ~0.5M.
 */
export function resolveTxGas(estimated: bigint): bigint {
  const suspectBlockFallback = 8_000_000n;
  const factoryFallback = 2_000_000n;
  if (estimated >= suspectBlockFallback) return factoryFallback;
  const padded = (estimated * 125n) / 100n;
  if (padded > BASE_TX_GAS_CAP) return BASE_TX_GAS_CAP;
  return padded < 21_000n ? 21_000n : padded;
}

export function humanizeTxError(err: unknown): string {
  const short =
    err && typeof err === "object" && "shortMessage" in err && typeof err.shortMessage === "string"
      ? err.shortMessage
      : err instanceof Error
        ? err.message
        : String(err);
  const lower = short.toLowerCase();
  if (lower.includes("user rejected") || lower.includes("denied transaction") || lower.includes("rejected the request")) {
    return "Signature rejected in wallet.";
  }
  if (lower.includes("exceeds maximum per-tx gas") || lower.includes("exceeds maximum per-transaction gas")) {
    return "Wallet used a gas limit above Base’s per-tx cap. Buy again — gas is set on our side now.";
  }
  if (lower.includes("insufficient funds")) {
    return "Not enough ETH on Base to pay gas.";
  }
  return short.split("\n")[0]?.trim() || "Transaction failed";
}
