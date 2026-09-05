import { describe, expect, it } from 'vitest';
import { buildHomeBrief } from '../../src/brief/copy.js';

describe('buildHomeBrief', () => {
  const wallet = '0x1234567890123456789012345678901234567890';

  it('uncovered wallet mentions next event', () => {
    const brief = buildHomeBrief({
      wallet,
      live: null,
      nextEvent: {
        id: 'cpi-mar',
        source: 'thetanuts_calendar',
        name: 'US CPI',
        category: 'macro',
        importance: 'high',
        assets: ['ETH'],
        tsUtc: new Date(Date.now() + 86_400_000).toISOString(),
        tsPrecision: 'datetime',
        stale: false,
      },
      coveragePctEth: 0,
      nakedUsd: 12_000,
      now: Date.now(),
    });
    expect(brief.kicker).toBe('Uncovered');
    expect(brief.greeting).toContain('0x1234');
    expect(brief.summary).toContain('US CPI');
  });

  it('active coverage uses roll window copy', () => {
    const expiry = Math.floor(Date.now() / 1000) + 3600;
    const brief = buildHomeBrief({
      wallet,
      live: {
        status: 'active',
        event_id: 'fomc',
        expiry_unix: expiry,
        quote_id: 'q1',
      },
      coveragePctEth: 100,
      rollingSoon: true,
      nextEvent: {
        id: 'nfp',
        source: 'supplement',
        name: 'NFP',
        category: 'macro',
        importance: 'high',
        assets: ['ETH'],
        tsUtc: new Date(Date.now() + 172_800_000).toISOString(),
        tsPrecision: 'datetime',
        stale: false,
      },
    });
    expect(brief.kicker).toBe('Roll window open');
    expect(brief.summary).toContain('NFP');
  });
});
