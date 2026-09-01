import { Hono } from 'hono';
import { env } from '../../config.js';
import { pingSupabase } from '../../db/supabase.js';
import { getProvider, getReadClient } from '../../thetanuts/client.js';
import { getFreshness } from '../../calendar/service.js';
import { ok } from '../request.js';
import type { AppVars } from '../request.js';

export const liveRoutes = new Hono<AppVars>()
  .get('/health', (c) => ok(c, { ok: true, status: 'live' }))
  .get('/ping', (c) => ok(c, { ok: true, pong: true }));

export const healthRoutes = new Hono<AppVars>().get('/health', async (c) => {
  let block: number | null = null;
  let ethPrice: number | null = null;
  let orderCount: number | null = null;
  let rpcError: string | undefined;
  try {
    block = await getProvider().getBlockNumber();
    const client = getReadClient();
    const md = await client.api.getMarketData();
    ethPrice = typeof md.prices?.ETH === 'number' ? md.prices.ETH : Number(md.prices?.ETH);
    const orders = await client.api.fetchOrders();
    orderCount = orders.length;
  } catch (e) {
    rpcError = e instanceof Error ? e.message : String(e);
  }
  const sb = await pingSupabase();
  const cal = getFreshness();
  return ok(c, {
    ok: true,
    chainId: env.CHAIN_ID,
    encodeOnly: env.encodeOnly,
    block,
    ethPrice,
    orderCount,
    rpcError,
    supabase: sb,
    calendar: cal,
  });
});
