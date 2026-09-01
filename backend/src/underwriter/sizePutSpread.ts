import type { CoverageIntent } from '../types/policy.js';

export function roundToTick(price: number, tick: number): number {
  return Math.round(price / tick) * tick;
}

export function tickFor(asset: CoverageIntent['asset']): number {
  return asset === 'BTC' ? 500 : 50;
}

export type SpreadStrikes = {
  kHi: number;
  kLo: number;
  widthUsd: number;
  deductiblePct: number;
};

export function sizePutSpreadStrikes(spot: number, maxDrawdownPct: number, asset: CoverageIntent['asset']): SpreadStrikes | null {
  const tick = tickFor(asset);
  const kHi = roundToTick(spot * (1 - maxDrawdownPct / 100), tick);
  const widthUsd = Math.max(tick, roundToTick(spot * 0.05, tick));
  const kLo = kHi - widthUsd;
  if (kHi <= 0 || kLo <= 0 || widthUsd <= 0) return null;
  return { kHi, kLo, widthUsd, deductiblePct: maxDrawdownPct };
}
