import { Hono } from 'hono';
import { getHoldings } from '../../holdings/service.js';
import { fail, ok } from '../request.js';
import type { AppVars } from '../request.js';

export const holdingsRoutes = new Hono<AppVars>().get('/holdings/:wallet', async (c) => {
  const wallet = c.req.param('wallet');
  if (!/^0x[a-fA-F0-9]{40}$/.test(wallet)) return fail(c, 'BAD_WALLET', 'invalid address');
  const h = await getHoldings(wallet);
  return ok(c, {
    wallet: wallet.toLowerCase(),
    eth: h.ethHuman,
    weth: h.wethHuman,
    cbbtc: h.cbbtcHuman,
    usdc: h.usdcHuman,
    ethBag: h.ethBagHuman,
    chain: {
      ethWei: h.ethWei.toString(),
      wethWei: h.wethWei.toString(),
      cbbtc: h.cbbtc.toString(),
      usdc: h.usdc.toString(),
    },
  });
});
