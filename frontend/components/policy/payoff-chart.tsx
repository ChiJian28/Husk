"use client";

import { useMemo } from "react";
import type { PayoffPoint } from "@/lib/types";

export function PayoffChart({ points }: { points: PayoffPoint[] }) {
  const parsed = useMemo(() => {
    return points
      .map((p) => ({
        price: Number(p.price),
        bag: Number(p.bagAloneUsd),
        covered: Number(p.bagPlusPolicyUsd),
      }))
      .filter((p) => Number.isFinite(p.price) && Number.isFinite(p.bag) && Number.isFinite(p.covered));
  }, [points]);

  if (parsed.length < 2) {
    return <p className="text-sm text-mute">Payoff arrives with the quote.</p>;
  }

  const w = 560;
  const h = 220;
  const pad = { l: 12, r: 12, t: 16, b: 28 };
  const xs = parsed.map((p) => p.price);
  const ys = parsed.flatMap((p) => [p.bag, p.covered]);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const sx = (x: number) => pad.l + ((x - minX) / (maxX - minX || 1)) * (w - pad.l - pad.r);
  const sy = (y: number) => pad.t + (1 - (y - minY) / (maxY - minY || 1)) * (h - pad.t - pad.b);

  const path = (key: "bag" | "covered") =>
    parsed.map((p, i) => `${i === 0 ? "M" : "L"} ${sx(p.price).toFixed(1)} ${sy(p[key]).toFixed(1)}`).join(" ");

  return (
    <div>
      <svg viewBox={`0 0 ${w} ${h}`} className="h-auto w-full" role="img" aria-label="Bag with and without coverage">
        <path d={path("bag")} fill="none" stroke="currentColor" className="text-mute" strokeWidth="1.5" />
        <path d={path("covered")} fill="none" stroke="currentColor" className="text-husk" strokeWidth="2.25" />
      </svg>
      <div className="mt-2 flex gap-4 text-[11px] text-mute">
        <span className="flex items-center gap-1.5">
          <i className="inline-block h-px w-4 bg-mute" />
          Bag alone
        </span>
        <span className="flex items-center gap-1.5">
          <i className="inline-block h-0.5 w-4 bg-husk" />
          Bag plus policy
        </span>
      </div>
    </div>
  );
}
