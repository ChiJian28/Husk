import { payoffAtPrice } from './bagPayoff.js';
import type { PolicyQuote } from '../types/policy.js';

export type StressPoint = {
  drawdownPct: number;
  priceUsd: string;
  bagAloneUsd: string;
  bagPlusPolicyUsd: string;
  cushionUsd: string;
};

export type StressPayoffOpts = {
  minDrawdownPct?: number;
  maxDrawdownPct?: number;
  steps?: number;
};

export function stressPayoffFromQuote(quote: PolicyQuote, opts: StressPayoffOpts = {}): StressPoint[] {
  const minDrawdownPct = opts.minDrawdownPct ?? -50;
  const maxDrawdownPct = opts.maxDrawdownPct ?? 0;
  const steps = opts.steps ?? 50;
  const premiumUsd = Number(quote.totalDebitUsdc);
  const protectedAmount = Number(quote.bag.protectedNotionalAsset);
  const base = {
    protectedAmount,
    structure: quote.structure,
    strikesUsd: quote.strikesUsd,
    numContractsHuman: quote.numContractsHuman,
    premiumUsd,
  };

  const series: StressPoint[] = [];
  for (let i = 0; i <= steps; i++) {
    const drawdownPct = minDrawdownPct + ((maxDrawdownPct - minDrawdownPct) * i) / steps;
    const price = quote.spot.price * (1 + drawdownPct / 100);
    const pt = payoffAtPrice({ ...base, price });
    series.push({
      drawdownPct: roundDrawdown(drawdownPct),
      priceUsd: price.toFixed(2),
      ...pt,
    });
  }
  return series;
}

export function stressPointAtDrawdown(quote: PolicyQuote, drawdownPct: number): StressPoint {
  const price = quote.spot.price * (1 + drawdownPct / 100);
  const pt = payoffAtPrice({
    price,
    protectedAmount: Number(quote.bag.protectedNotionalAsset),
    structure: quote.structure,
    strikesUsd: quote.strikesUsd,
    numContractsHuman: quote.numContractsHuman,
    premiumUsd: Number(quote.totalDebitUsdc),
  });
  return {
    drawdownPct: roundDrawdown(drawdownPct),
    priceUsd: price.toFixed(2),
    ...pt,
  };
}

function roundDrawdown(n: number) {
  return Math.round(n * 100) / 100;
}
