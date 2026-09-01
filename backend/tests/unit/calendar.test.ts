import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { OfficialReportSchema } from '../../src/calendar/schema.js';
import { normalizeOfficial } from '../../src/calendar/normalize.js';

describe('calendar fixture', () => {
  it('zod-accepts the live sanitized report', () => {
    const raw = JSON.parse(
      readFileSync(new URL('../fixtures/calendar-report.json', import.meta.url), 'utf8'),
    );
    const report = OfficialReportSchema.parse(raw);
    expect(report.events.length).toBeGreaterThan(0);
    const events = normalizeOfficial(report, false);
    expect(events.some((e) => e.name.toUpperCase().includes('CPI'))).toBe(true);
    expect(events.some((e) => e.name.toUpperCase().includes('PAYROLL') || e.name.toUpperCase().includes('EMPLOYMENT'))).toBe(true);
  });
});
