import { describe, expect, it } from 'vitest';
import { chooseExpiryUnix, eventInstant, generate0800Grid } from '../../src/expiry/spanEvent.js';

describe('spanEvent', () => {
  it('CPI date_only vs same-day 08:00Z rolls to next 08:00Z', () => {
    const ev = {
      tsUtc: '2026-09-11T23:59:59.000Z',
      tsPrecision: 'date_only' as const,
      name: 'CPI (Consumer Price Index)',
      category: 'macro',
    };
    const { tEvent } = eventInstant(ev);
    const tEventUnix = Math.floor(tEvent.getTime() / 1000);
    const sameDay0800 = Date.UTC(2026, 8, 11, 8, 0, 0) / 1000;
    expect(tEventUnix).toBeGreaterThan(sameDay0800);
    const grid = generate0800Grid(sameDay0800 - 86400, 14);
    grid.push(sameDay0800);
    const { expiryUnix } = chooseExpiryUnix({ tEventUnix, grid, cryptoBucket: false });
    expect(expiryUnix).toBeGreaterThan(tEventUnix);
    const iso = new Date(expiryUnix * 1000).toISOString();
    expect(iso).toBe('2026-09-12T08:00:00.000Z');
  });

  it('crypto expiry bucket may equal T', () => {
    const t = Date.UTC(2026, 8, 4, 8, 0, 0) / 1000;
    const { expiryUnix } = chooseExpiryUnix({
      tEventUnix: t,
      grid: [t, t + 86400],
      cryptoBucket: true,
    });
    expect(expiryUnix).toBe(t);
  });
});
