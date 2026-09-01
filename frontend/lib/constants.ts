export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8787";
export const WALLETCONNECT_PROJECT_ID =
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? "husk-local-dev";
export const CHAIN_ID = 8453 as const;
export { DEMO_WALLET, QUOTE_TTL_MS, ROLL_WINDOW_HOURS } from "@/lib/coverage";
export const USDC_DECIMALS = 6;

export const Z = {
  header: 20,
  nav: 30,
  overlay: 40,
  toast: 50,
  grain: 60,
} as const;

export const SPRING = { type: "spring" as const, stiffness: 100, damping: 20 };

export const MASCOT = {
  normal: "/mascots/husk_mascot_normal.png",
  approaching: "/mascots/husk_mascot_event_approaching.png",
  active: "/mascots/husk_mascot_protection_active.png",
  payout: "/mascots/husk_mascot_payout_triggered.png",
  error: "/mascots/husk_mascot_error.png",
} as const;

export type MascotMood = keyof typeof MASCOT;
