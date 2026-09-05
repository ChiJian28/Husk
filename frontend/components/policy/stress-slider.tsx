"use client";

import { useMemo, useState } from "react";
import { Lightning } from "@phosphor-icons/react";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuoteStress } from "@/hooks/useApi";
import { formatDrawdownLabel, interpolateStress } from "@/lib/stress";
import { formatUsdc } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Asset } from "@/lib/types";

export function StressSlider({ quoteId, asset }: { quoteId: string; asset: Asset }) {
  const stress = useQuoteStress(quoteId);
  const [dropPct, setDropPct] = useState(35);

  const data = stress.data;
  const series = data?.series ?? [];
  const minDrop = series.length ? Math.abs(Math.min(...series.map((p) => p.drawdownPct))) : 50;

  const drawdownPct = -dropPct;
  const at = useMemo(() => {
    if (!series.length) return null;
    return interpolateStress(series, drawdownPct);
  }, [series, drawdownPct]);

  if (stress.isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (stress.isError || !data || !at || series.length < 2) {
    return <p className="text-sm text-mute">Stress preview unavailable for this quote.</p>;
  }

  const bagAlone = Number(at.bagAloneUsd);
  const bagPlus = Number(at.bagPlusPolicyUsd);
  const cushion = Number(at.cushionUsd);
  const spotPrice = Number(at.priceUsd);
  const spotBagAtQuote = data.spot.price * Number(data.protectedNotionalAsset);
  const lossFromSpot = bagAlone - spotBagAtQuote;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-mute">Stress slider</p>
        <p className="text-sm text-ink">
          Simulated crash:{" "}
          <span className="font-semibold text-naked">{formatDrawdownLabel(drawdownPct)}</span>
        </p>
      </div>

      <div>
        <input
          type="range"
          min={0}
          max={minDrop}
          step={1}
          value={dropPct}
          onChange={(e) => setDropPct(Number(e.target.value))}
          className="h-2 w-full cursor-pointer accent-husk"
          aria-label="Simulated market drawdown"
        />
        <div className="mt-1.5 flex justify-between text-[10px] text-mute">
          <span>0% normal</span>
          <span>-15%</span>
          <span>-30% slump</span>
          <span>-{minDrop % 1 === 0 ? minDrop.toFixed(0) : minDrop.toFixed(1)}% crash</span>
        </div>
      </div>

      <div className="rounded-input border border-line bg-sunken/30 px-3 py-2.5">
        <p className="text-xs text-mute">
          {asset} @ {formatUsdc(spotPrice)} ({formatDrawdownLabel(drawdownPct)})
        </p>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div>
            <p className="text-[11px] text-mute">Spot only</p>
            <p className="text-lg font-semibold text-naked">{formatUsdc(bagAlone)}</p>
            {Number.isFinite(lossFromSpot) && lossFromSpot < 0 ? (
              <p className="text-xs text-naked/80">({formatUsdc(lossFromSpot)})</p>
            ) : null}
          </div>
          <div>
            <p className="text-[11px] text-mute">Spot + Husk policy</p>
            <p className="text-lg font-semibold text-husk">{formatUsdc(bagPlus)}</p>
            {cushion > 0 ? (
              <span className="mt-1 inline-block rounded-full bg-husk-soft px-2 py-0.5 text-xs font-medium text-husk">
                +{formatUsdc(cushion)} cushion
              </span>
            ) : (
              <p className="text-xs text-mute">No payout yet above the floor</p>
            )}
          </div>
        </div>
      </div>

      <StressChart
        series={series}
        drawdownPct={drawdownPct}
        at={at}
        protectionDrawdownPct={data.protectionActivatesBelowDrawdownPct}
      />

      <p className="flex items-center gap-1.5 text-xs text-mute">
        <Lightning className="size-3.5 shrink-0 text-husk" weight="fill" />
        Protection zone activates below {formatDrawdownLabel(data.protectionActivatesBelowDrawdownPct)}
      </p>
    </div>
  );
}

function StressChart({
  series,
  drawdownPct,
  at,
  protectionDrawdownPct,
}: {
  series: { drawdownPct: number; bagAloneUsd: string; bagPlusPolicyUsd: string }[];
  drawdownPct: number;
  at: { bagAloneUsd: string; bagPlusPolicyUsd: string };
  protectionDrawdownPct: number;
}) {
  const parsed = useMemo(
    () =>
      series
        .map((p) => ({
          x: p.drawdownPct,
          bag: Number(p.bagAloneUsd),
          covered: Number(p.bagPlusPolicyUsd),
        }))
        .filter((p) => Number.isFinite(p.bag) && Number.isFinite(p.covered)),
    [series],
  );

  const layout = useMemo(() => {
    if (parsed.length < 2) return null;

    const w = 560;
    const h = 200;
    const pad = { l: 46, r: 10, t: 14, b: 26 };
    const xs = parsed.map((p) => p.x);
    const ys = parsed.flatMap((p) => [p.bag, p.covered]);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const ySpan = maxY - minY || 1;

    const sx = (x: number) => pad.l + ((x - minX) / (maxX - minX || 1)) * (w - pad.l - pad.r);
    const sy = (y: number) => pad.t + (1 - (y - minY) / ySpan) * (h - pad.t - pad.b);

    const yTicks = Array.from({ length: 4 }, (_, i) => minY + (ySpan * i) / 3);
    const xGuides = [-30, -15, protectionDrawdownPct].filter(
      (x) => x >= minX && x <= maxX && x !== 0,
    );
    const uniqueXGuides = [...new Set(xGuides)].sort((a, b) => a - b);

    return { w, h, pad, minX, maxX, minY, maxY, sx, sy, yTicks, xGuides: uniqueXGuides };
  }, [parsed, protectionDrawdownPct]);

  if (!layout || parsed.length < 2) return null;

  const { w, h, pad, minX, maxX, sx, sy, yTicks, xGuides } = layout;

  const path = (key: "bag" | "covered") =>
    parsed.map((p, i) => `${i === 0 ? "M" : "L"} ${sx(p.x).toFixed(1)} ${sy(p[key]).toFixed(1)}`).join(" ");

  const markerX = sx(drawdownPct);
  const markerBagY = sy(Number(at.bagAloneUsd));
  const markerCovY = sy(Number(at.bagPlusPolicyUsd));
  const plotRight = w - pad.r;
  const plotBottom = h - pad.b;

  return (
    <div>
      <svg viewBox={`0 0 ${w} ${h}`} className="h-auto w-full" role="img" aria-label="Stress payoff chart">
        {/* horizontal grid + Y ticks */}
        {yTicks.map((y) => {
          const yPos = sy(y);
          return (
            <g key={`y-${y.toFixed(2)}`}>
              <line
                x1={pad.l}
                y1={yPos}
                x2={plotRight}
                y2={yPos}
                className="stroke-line/70"
                strokeWidth="1"
                strokeDasharray="3 5"
              />
              <text
                x={pad.l - 6}
                y={yPos + 3}
                textAnchor="end"
                className="fill-mute text-[9px]"
              >
                {formatCompactUsd(y)}
              </text>
            </g>
          );
        })}

        {/* vertical guides at key drawdowns */}
        {xGuides.map((x) => (
          <line
            key={`x-${x}`}
            x1={sx(x)}
            y1={pad.t}
            x2={sx(x)}
            y2={plotBottom}
            className={cn(
              "stroke-line/50",
              x === protectionDrawdownPct && "stroke-husk/35",
            )}
            strokeWidth="1"
            strokeDasharray="2 4"
          />
        ))}

        {/* slider marker */}
        <line
          x1={markerX}
          y1={pad.t}
          x2={markerX}
          y2={plotBottom}
          className="stroke-ink/25"
          strokeWidth="1.25"
          strokeDasharray="4 3"
        />

        <path
          d={path("bag")}
          fill="none"
          stroke="currentColor"
          className="text-naked/70"
          strokeWidth="1.5"
          strokeDasharray="5 4"
        />
        <path
          d={path("covered")}
          fill="none"
          stroke="currentColor"
          className="text-husk"
          strokeWidth="2.25"
        />
        <circle cx={markerX} cy={markerBagY} r="3.5" className="fill-naked" />
        <circle cx={markerX} cy={markerCovY} r="3.5" className="fill-husk" />

        {/* baseline X axis (no arrow) */}
        <line
          x1={pad.l}
          y1={plotBottom}
          x2={plotRight}
          y2={plotBottom}
          className="stroke-line"
          strokeWidth="1"
        />
        <text x={pad.l} y={h - 6} className="fill-mute text-[9px]">
          Extreme {formatDrawdownLabel(minX)}
        </text>
        <text x={plotRight} y={h - 6} textAnchor="end" className="fill-mute text-[9px]">
          Normal 0%
        </text>
      </svg>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-mute">
        <span className="flex items-center gap-1.5">
          <i className="inline-block h-px w-4 border-t border-dashed border-naked/70" />
          Bag alone
        </span>
        <span className="flex items-center gap-1.5">
          <i className={cn("inline-block h-0.5 w-4 bg-husk")} />
          Bag + policy
        </span>
        {xGuides.includes(protectionDrawdownPct) ? (
          <span className="flex items-center gap-1.5">
            <i className="inline-block h-3 w-px border-l border-dashed border-husk/50" />
            Floor {formatDrawdownLabel(protectionDrawdownPct)}
          </span>
        ) : null}
      </div>
    </div>
  );
}

function formatCompactUsd(value: number) {
  if (!Number.isFinite(value)) return "-";
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (abs >= 10_000) return `$${Math.round(value / 1000)}k`;
  if (abs >= 1000) return `$${(value / 1000).toFixed(1)}k`;
  return `$${Math.round(value)}`;
}
