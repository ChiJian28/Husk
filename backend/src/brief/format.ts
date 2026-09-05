import type { CalendarEvent } from '../types/policy.js';

const fmtUsd = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

export function formatPct(value: number) {
  return `${value % 1 === 0 ? value.toFixed(0) : value.toFixed(1)}%`;
}

export function formatUnix(unix: number) {
  const d = new Date(unix * 1000);
  if (Number.isNaN(d.getTime())) return String(unix);
  return (
    new Intl.DateTimeFormat('en-GB', {
      timeZone: 'UTC',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(d) + ' UTC'
  );
}

export function countdownTo(iso: string, now = Date.now()) {
  const target = Date.parse(iso);
  if (!Number.isFinite(target)) return '';
  const delta = target - now;
  if (delta <= 0) return 'started';
  const h = Math.floor(delta / 3_600_000);
  const d = Math.floor(h / 24);
  if (d >= 2) return `${d}d`;
  if (h >= 1) return `${h}h`;
  const m = Math.max(1, Math.floor(delta / 60_000));
  return `${m}m`;
}

export function shortWallet(address: string) {
  return `${address.slice(0, 6)}....${address.slice(-4)}`;
}

export function timeGreeting(now = new Date()) {
  const h = now.getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export function formatNakedUsd(value: number) {
  return fmtUsd.format(Math.round(value));
}

export function stripThesis(event: CalendarEvent): Omit<CalendarEvent, 'officialThesis'> {
  const { officialThesis: _t, ...rest } = event;
  return rest;
}
