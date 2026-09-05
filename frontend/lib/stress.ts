import type { StressPoint } from "@/lib/types";

export function interpolateStress(series: StressPoint[], drawdownPct: number): StressPoint {
  if (series.length === 0) {
    throw new Error("empty stress series");
  }
  const sorted = [...series].sort((a, b) => a.drawdownPct - b.drawdownPct);
  if (drawdownPct <= sorted[0]!.drawdownPct) return sorted[0]!;
  if (drawdownPct >= sorted.at(-1)!.drawdownPct) return sorted.at(-1)!;

  for (let i = 0; i < sorted.length - 1; i++) {
    const a = sorted[i]!;
    const b = sorted[i + 1]!;
    if (drawdownPct >= a.drawdownPct && drawdownPct <= b.drawdownPct) {
      const t = (drawdownPct - a.drawdownPct) / (b.drawdownPct - a.drawdownPct || 1);
      const lerp = (x: string, y: string) => (Number(x) + t * (Number(y) - Number(x))).toFixed(2);
      return {
        drawdownPct,
        priceUsd: lerp(a.priceUsd, b.priceUsd),
        bagAloneUsd: lerp(a.bagAloneUsd, b.bagAloneUsd),
        bagPlusPolicyUsd: lerp(a.bagPlusPolicyUsd, b.bagPlusPolicyUsd),
        cushionUsd: lerp(a.cushionUsd, b.cushionUsd),
      };
    }
  }
  return sorted.at(-1)!;
}

export function formatDrawdownLabel(pct: number) {
  if (pct === 0) return "0%";
  return `${pct % 1 === 0 ? pct.toFixed(0) : pct.toFixed(1)}%`;
}
