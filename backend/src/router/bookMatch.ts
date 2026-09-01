import type { OrderWithSignature } from '@thetanuts-finance/thetanuts-client';
import { getReadClient } from '../thetanuts/client.js';
import { previewFill } from '../thetanuts/preview.js';
import { env } from '../config.js';
import type { Asset, Structure } from '../types/policy.js';

export type BookMatch = {
  order: OrderWithSignature;
  implName: string;
  preview: ReturnType<typeof previewFill>;
  usdcAmount: bigint;
};

function implNameOf(order: OrderWithSignature): string | undefined {
  const impl = order.rawApiData?.implementation?.toLowerCase();
  if (!impl) return undefined;
  return getReadClient().chainConfig.optionImplementations[impl]?.name;
}

function wantedImpl(structure: Structure): string[] {
  return structure === 'PUT_SPREAD' ? ['PUT_SPREAD'] : ['PUT'];
}

function tickUsd(asset: Asset): number {
  return asset === 'BTC' ? 500 : 50;
}

export async function findBookMatch(opts: {
  asset: Asset;
  structure: Structure;
  expiryUnix: number;
  tEventUnix: number;
  cryptoBucket: boolean;
  targetStrikesUsd: number[];
  usdcBudget: bigint;
}): Promise<BookMatch | null> {
  if (env.huskForceRfq) return null;
  const client = getReadClient();
  const now = Math.floor(Date.now() / 1000);
  let orders: OrderWithSignature[] = [];
  try {
    orders = await client.api.fetchOrders();
  } catch (e) {
    return null;
  }
  orders = orders.filter((o) => {
    const exp = Number(o.order.expiry);
    if (!Number.isFinite(exp) || exp <= now) return false;
    const feed = o.rawApiData?.priceFeed?.toLowerCase();
    const ethFeed = client.chainConfig.priceFeeds.ETH?.toLowerCase();
    const btcFeed = client.chainConfig.priceFeeds.BTC?.toLowerCase();
    if (opts.asset === 'ETH' && ethFeed && feed !== ethFeed) return false;
    if (opts.asset === 'BTC' && btcFeed && feed !== btcFeed) return false;
    if (o.rawApiData?.isCall) return false;
    return true;
  });
  const windowEnd = opts.expiryUnix + 36 * 3600;
  const wanted = new Set(wantedImpl(opts.structure));
  const tick = tickUsd(opts.asset);
  const candidates: BookMatch[] = [];

  for (const order of orders) {
    const name = implNameOf(order);
    if (!name || !wanted.has(name)) continue;
    const expiry = Number(order.order.expiry);
    if (expiry > windowEnd) continue;
    if (opts.cryptoBucket) {
      if (expiry < opts.tEventUnix) continue;
    } else if (expiry <= opts.tEventUnix) {
      continue;
    }
    const rawStrikes = (order.order.strikes ?? order.rawApiData?.strikes.map((s) => BigInt(s)) ?? []).map(
      (s) => Number(s) / 1e8,
    );
    if (opts.structure === 'PUT_SPREAD' && rawStrikes.length !== 2) continue;
    if (opts.structure === 'PUT' && rawStrikes.length !== 1) continue;
    const sortedTarget = [...opts.targetStrikesUsd].sort((a, b) => a - b);
    const sortedOrder = [...rawStrikes].sort((a, b) => a - b);
    let close = true;
    if (sortedTarget.length !== sortedOrder.length) close = false;
    else {
      for (let i = 0; i < sortedTarget.length; i++) {
        if (Math.abs(sortedTarget[i]! - sortedOrder[i]!) > 2 * tick) close = false;
      }
    }
    if (!close) continue;
    if (order.availableAmount < opts.usdcBudget) continue;
    try {
      const preview = previewFill(order, opts.usdcBudget);
      if (preview.totalCollateral === 0n || preview.numContracts === 0n) continue;
      candidates.push({ order, implName: name, preview, usdcAmount: opts.usdcBudget });
    } catch {
      continue;
    }
  }

  candidates.sort((a, b) => {
    const coll = a.preview.totalCollateral - b.preview.totalCollateral;
    if (coll !== 0n) return coll < 0n ? -1 : 1;
    return 0;
  });
  return candidates[0] ?? null;
}
