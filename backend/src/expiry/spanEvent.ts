/**
 * Map an event instant onto the Thetanuts settlement grid.
 *
 * Product law: expiry must span the print. For date_only CPI/NFP, treat as
 * 12:30 America/New_York; FOMC as 14:00 ET. Never pick a T <= tEvent for macros.
 */
export function wallTimeInZoneToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  timeZone: string,
): Date {
  const utcGuess = Date.UTC(year, month - 1, day, hour, minute, 0);
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  const asUtcParts = (ms: number) => {
    const parts = Object.fromEntries(dtf.formatToParts(new Date(ms)).map((p) => [p.type, p.value]));
    const h = parts.hour === '24' ? 0 : Number(parts.hour);
    return Date.UTC(
      Number(parts.year),
      Number(parts.month) - 1,
      Number(parts.day),
      h,
      Number(parts.minute),
      Number(parts.second),
    );
  };
  const offset = asUtcParts(utcGuess) - utcGuess;
  let utc = utcGuess - offset;
  const offset2 = asUtcParts(utc) - utc;
  if (offset2 !== offset) utc = utcGuess - offset2;
  return new Date(utc);
}

export function eventInstant(ev: {
  tsUtc: string;
  tsPrecision: 'datetime' | 'date_only';
  name: string;
  category: string;
}): { tEvent: Date; reason: string } {
  const parsed = new Date(ev.tsUtc);
  if (ev.tsPrecision === 'datetime' || ev.category === 'crypto_expiry') {
    return {
      tEvent: parsed,
      reason:
        ev.category === 'crypto_expiry'
          ? `crypto expiry bucket at ${parsed.toISOString()} (Chainlink TWAP settlement)`
          : `event timestamp ${parsed.toISOString()}`,
    };
  }

  const y = parsed.getUTCFullYear();
  const m = parsed.getUTCMonth() + 1;
  const d = parsed.getUTCDate();
  const n = ev.name.toUpperCase();
  const isCpiNfp =
    n.includes('CPI') || n.includes('PAYROLL') || n.includes('EMPLOYMENT') || n.includes('NFP');
  const isFomc = n.includes('FOMC');

  if (isCpiNfp) {
    const t = wallTimeInZoneToUtc(y, m, d, 12, 30, 'America/New_York');
    return { tEvent: t, reason: `date_only ${ev.name} mapped to 12:30 America/New_York (${t.toISOString()})` };
  }
  if (isFomc) {
    const t = wallTimeInZoneToUtc(y, m, d, 14, 0, 'America/New_York');
    return { tEvent: t, reason: `date_only FOMC mapped to 14:00 America/New_York (${t.toISOString()})` };
  }
  const end = new Date(Date.UTC(y, m - 1, d, 23, 59, 59));
  return { tEvent: end, reason: `date_only unknown print treated as 23:59:59 UTC ${end.toISOString()}` };
}

export function nextDaily0800UtcAfter(unixSec: number, inclusive = false): number {
  const t = unixSec;
  const d = new Date(t * 1000);
  const candidate = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 8, 0, 0) / 1000;
  if (inclusive ? candidate >= t : candidate > t) return candidate;
  return candidate + 86400;
}

export function generate0800Grid(fromUnix: number, days = 14): number[] {
  const start = nextDaily0800UtcAfter(fromUnix, true);
  const out: number[] = [];
  for (let i = 0; i < days; i++) out.push(start + i * 86400);
  return out;
}

export function chooseExpiryUnix(opts: {
  tEventUnix: number;
  grid: number[];
  cryptoBucket: boolean;
}): { expiryUnix: number; expiryReason: string } {
  const { tEventUnix, grid, cryptoBucket } = opts;
  const sorted = [...new Set(grid)].sort((a, b) => a - b);
  if (cryptoBucket) {
    const exact = sorted.find((t) => t === tEventUnix);
    if (exact != null) {
      return {
        expiryUnix: exact,
        expiryReason: `covers the ${new Date(exact * 1000).toISOString()} Chainlink TWAP settlement bucket (event is that expiry)`,
      };
    }
    const ge = sorted.find((t) => t >= tEventUnix);
    if (ge != null) {
      return {
        expiryUnix: ge,
        expiryReason: `next Chainlink TWAP settlement on/after crypto expiry ${new Date(ge * 1000).toISOString()}`,
      };
    }
  }
  const after = sorted.find((t) => t > tEventUnix);
  if (after == null) {
    const fallback = nextDaily0800UtcAfter(tEventUnix, false);
    return {
      expiryUnix: fallback,
      expiryReason: `next Chainlink TWAP 08:00 UTC after the print (${new Date(fallback * 1000).toISOString()})`,
    };
  }
  return {
    expiryUnix: after,
    expiryReason: `next Chainlink TWAP settlement after the print (${new Date(after * 1000).toISOString()})`,
  };
}
