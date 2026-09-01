import type { Asset, CalendarEvent } from '../types/policy.js';

export function pickUpcomingEvent(
  shelf: CalendarEvent[],
  asset: Asset,
  now = Date.now(),
): CalendarEvent | undefined {
  const future = (e: CalendarEvent) => Date.parse(e.tsUtc) > now && e.assets.includes(asset);
  const headline = (e: CalendarEvent) => /cpi|fomc|nfp|payroll|employment/i.test(e.name);
  return (
    shelf.find((e) => future(e) && e.category === 'macro' && headline(e)) ??
    shelf.find((e) => future(e) && e.category === 'macro' && e.importance === 'high') ??
    shelf.find((e) => future(e) && e.category === 'macro') ??
    shelf.find(future)
  );
}

const NAMED: { user: RegExp; event: RegExp }[] = [
  { user: /\bcpi\b|inflation/, event: /cpi/i },
  { user: /\bfomc\b|\bfed\b|rate decision/, event: /fomc|fed/i },
  { user: /\bnfp\b|payroll|non[- ]?farm|employment situation/, event: /nfp|payroll|employment/i },
];

export function inferNamedEvent(
  utterance: string,
  shelf: CalendarEvent[],
  asset: Asset,
  now = Date.now(),
): CalendarEvent | undefined {
  const u = utterance.toLowerCase();
  for (const r of NAMED) {
    if (!r.user.test(u)) continue;
    const hit = shelf.find(
      (e) => Date.parse(e.tsUtc) > now && r.event.test(e.name) && e.assets.includes(asset),
    );
    if (hit) return hit;
  }
  return undefined;
}

export function inferEventFromUtterance(
  utterance: string,
  shelf: CalendarEvent[],
  asset: Asset,
  now = Date.now(),
): CalendarEvent | undefined {
  return inferNamedEvent(utterance, shelf, asset, now) ?? pickUpcomingEvent(shelf, asset, now);
}
