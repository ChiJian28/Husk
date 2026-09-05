import type { CalendarEvent } from '../types/policy.js';
import { countdownTo, formatNakedUsd, formatPct, formatUnix, shortWallet, timeGreeting } from './format.js';
import type { CoverageRow } from './metrics.js';
import { isExpiringSoon } from './metrics.js';

export type HomeBrief = {
  kicker: string;
  greeting: string;
  summary: string;
};

export type BuildBriefInput = {
  wallet: string;
  live: CoverageRow | null;
  nextEvent?: CalendarEvent;
  coveragePctEth?: number | null;
  nakedUsd?: number | null;
  rollingSoon?: boolean;
  now?: number;
};

export function buildHomeBrief(input: BuildBriefInput): HomeBrief {
  const now = input.now ?? Date.now();
  const greeting = `${timeGreeting(new Date(now))}, ${shortWallet(input.wallet)}.`;

  const next = input.nextEvent;
  const nextLine = next ? `${next.name} (${countdownTo(next.tsUtc, now)})` : 'the next shelf event';

  if (input.live?.status === 'awaiting_signature') {
    return {
      kicker: 'Action needed',
      greeting,
      summary: `Settlement calldata is ready for your open RFQ. Sign once to lock the floor before ${nextLine}.`,
    };
  }

  if (input.live?.status === 'rfq_open') {
    return {
      kicker: 'RFQ in flight',
      greeting,
      summary: `A maker offer is still pending on-chain. Nothing else is waiting on you right now.${next ? ` After it settles, ${nextLine} is the natural roll target.` : ''}`,
    };
  }

  if (input.live?.status === 'active') {
    if (input.rollingSoon) {
      return {
        kicker: 'Roll window open',
        greeting,
        summary: `Coverage expires ${formatUnix(input.live.expiry_unix)}. ${next ? `${nextLine} is up next — renew before settlement if you want continuity through the print.` : 'Pick the next event on the shelf to extend.'}`,
      };
    }
    const pct =
      input.coveragePctEth != null
        ? `${formatPct(input.coveragePctEth)} of your ETH bag is floored`
        : 'You have active coverage';
    return {
      kicker: 'Coverage active',
      greeting,
      summary: `${pct} through ${formatUnix(input.live.expiry_unix)}. ${next ? `${nextLine} is the headline event ahead.` : 'Browse the shelf when you want to extend.'}`,
    };
  }

  const naked =
    input.nakedUsd != null && input.nakedUsd > 0
      ? `${formatNakedUsd(input.nakedUsd)} of spot bag is naked`
      : input.coveragePctEth != null && input.coveragePctEth < 100
        ? `${formatPct(100 - input.coveragePctEth)} of your ETH bag is uncovered`
        : 'Your bag has no active floor';

  return {
    kicker: 'Uncovered',
    greeting,
    summary: `${naked}. ${next ? `${nextLine} is the next print worth hedging — open it on the shelf to quote a defined-risk put spread.` : 'Add a custom window or wait for the next official event.'}`,
  };
}

export function briefRollingSoon(live: CoverageRow | null, now = Date.now()) {
  return !!(live && live.status === 'active' && isExpiringSoon(live.expiry_unix, now));
}
