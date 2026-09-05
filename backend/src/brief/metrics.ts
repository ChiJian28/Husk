import type { PolicyQuote, QuoteStatus } from '../types/policy.js';

export const ROLL_WINDOW_HOURS = 24;

const LIVE: QuoteStatus[] = ['active', 'rfq_open', 'awaiting_signature'];

export type CoverageRow = {
  status: QuoteStatus;
  event_id: string | null;
  expiry_unix: number;
  quote_id: string | null;
  asset?: string | null;
};

export type BriefMetrics = {
  coveragePctEth: number | null;
  coveragePctBtc: number | null;
  nakedUsd: number | null;
  bagUsd: number | null;
  ethBag: number;
  pendingNotional: boolean;
};

export function latestLiveCoverage(rows: CoverageRow[]): CoverageRow | null {
  const live = rows.filter((r) => LIVE.includes(r.status)).sort((a, b) => b.expiry_unix - a.expiry_unix);
  return live[0] ?? null;
}

export function isExpiringSoon(expiryUnix: number, now = Date.now()) {
  const h = (expiryUnix * 1000 - now) / 3_600_000;
  return h > 0 && h <= ROLL_WINDOW_HOURS;
}

export function computeBriefMetrics(args: {
  ethBagHuman: string;
  cbbtcHuman: string;
  rows: CoverageRow[];
  quotes: Record<string, PolicyQuote>;
  ethPrice: number | null;
}): BriefMetrics {
  const bag = Number(args.ethBagHuman);
  const btc = Number(args.cbbtcHuman);
  const ethBag = Number.isFinite(bag) ? bag : 0;
  const cbbtc = Number.isFinite(btc) ? btc : 0;
  const active = args.rows.filter((r) => r.status === 'active');

  let protectedEth = 0;
  let protectedCbbtc = 0;
  let hasEthPolicy = false;
  let hasBtcPolicy = false;
  let pendingNotional = false;
  let unknownNotional = false;

  for (const row of active) {
    const rowAsset = (row.asset ?? 'ETH').toUpperCase();
    if (rowAsset === 'BTC') hasBtcPolicy = true;
    else hasEthPolicy = true;

    const q = row.quote_id ? args.quotes[row.quote_id] : undefined;
    if (row.quote_id && !q) {
      pendingNotional = true;
      continue;
    }
    if (!q) {
      unknownNotional = true;
      continue;
    }
    const amt = Number(q.bag.protectedNotionalAsset);
    if (!Number.isFinite(amt)) {
      unknownNotional = true;
      continue;
    }
    const asset = (q.intent.asset ?? rowAsset).toUpperCase();
    if (asset === 'BTC') protectedCbbtc += amt;
    else protectedEth += amt;
  }

  if (ethBag > 0) protectedEth = Math.min(protectedEth, ethBag);
  if (cbbtc > 0) protectedCbbtc = Math.min(protectedCbbtc, cbbtc);

  const incomplete = pendingNotional || unknownNotional;
  const nakedEth = incomplete ? 0 : Math.max(0, ethBag - protectedEth);
  const price = args.ethPrice;
  const bagUsd = price != null && Number.isFinite(price) ? ethBag * price : null;
  const nakedUsd =
    incomplete || price == null || !Number.isFinite(price) ? null : nakedEth * price;

  const coveragePctEth = incomplete
    ? hasEthPolicy
      ? null
      : 0
    : ethBag > 0
      ? (protectedEth / ethBag) * 100
      : hasEthPolicy
        ? 100
        : 0;

  const coveragePctBtc = incomplete
    ? hasBtcPolicy
      ? null
      : cbbtc > 0
        ? 0
        : null
    : cbbtc > 0
      ? (protectedCbbtc / cbbtc) * 100
      : hasBtcPolicy
        ? 100
        : null;

  return {
    coveragePctEth,
    coveragePctBtc,
    nakedUsd,
    bagUsd,
    ethBag,
    pendingNotional,
  };
}
