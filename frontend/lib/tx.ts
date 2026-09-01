import { toBigInt } from "ethers";

/** DecimalString wei from the API → bigint for wagmi. Never JSON-number USDC. */
export function weiToBigint(value: string): bigint {
  if (!value || value === "0") return BigInt(0);
  return toBigInt(value);
}
