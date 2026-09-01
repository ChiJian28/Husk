import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function isAddress(value: string | undefined | null): value is `0x${string}` {
  return !!value && /^0x[a-fA-F0-9]{40}$/.test(value);
}

export function isTxHash(value: string | undefined | null): value is `0x${string}` {
  return !!value && /^0x[a-fA-F0-9]{64}$/.test(value);
}

export function basescanTx(hash: string) {
  return `https://basescan.org/tx/${hash}`;
}

export function basescanAddress(address: string) {
  return `https://basescan.org/address/${address}`;
}

export function shortAddr(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}
