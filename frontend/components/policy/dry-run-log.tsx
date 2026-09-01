"use client";

import { AccordionContent, AccordionItem, AccordionRoot, AccordionTrigger } from "@/components/ui/accordion";

function rowsOf(value: Record<string, unknown>, prefix = ""): { k: string; v: string }[] {
  const out: { k: string; v: string }[] = [];
  for (const [key, raw] of Object.entries(value)) {
    const k = prefix ? `${prefix}.${key}` : key;
    if (raw !== null && typeof raw === "object" && !Array.isArray(raw)) {
      out.push(...rowsOf(raw as Record<string, unknown>, k));
    } else {
      out.push({ k, v: Array.isArray(raw) ? JSON.stringify(raw) : String(raw) });
    }
  }
  return out;
}

export function DryRunLog({ dryRun }: { dryRun: Record<string, unknown> }) {
  const entries = rowsOf(dryRun);
  const json = JSON.stringify(dryRun, null, 2);
  if (entries.length === 0) {
    return null;
  }
  return (
    <AccordionRoot type="single" collapsible>
      <AccordionItem value="dry-run">
        <AccordionTrigger>Dry-run preview (judges)</AccordionTrigger>
        <AccordionContent>
          <dl className="grid grid-cols-1 gap-x-4 gap-y-1.5 font-mono text-xs sm:grid-cols-[minmax(8rem,14rem)_1fr]">
            {entries.map((row) => (
              <div key={row.k} className="contents">
                <dt className="text-mute">{row.k}</dt>
                <dd className="break-all text-ink">{row.v}</dd>
              </div>
            ))}
          </dl>
          <pre className="mt-3 max-h-48 overflow-auto rounded-input bg-sunken p-3 font-mono text-[11px] leading-relaxed text-ink">
            {json}
          </pre>
        </AccordionContent>
      </AccordionItem>
    </AccordionRoot>
  );
}
