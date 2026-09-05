import { Hono } from 'hono';
import { getWalletBrief } from '../../brief/service.js';
import { fail, ok } from '../request.js';
import type { AppVars } from '../request.js';

export const briefRoutes = new Hono<AppVars>().get('/brief/:wallet', async (c) => {
  const wallet = c.req.param('wallet');
  if (!/^0x[a-fA-F0-9]{40}$/.test(wallet)) return fail(c, 'BAD_WALLET', 'invalid address', 400);
  const ai = c.req.query('ai');
  try {
    const brief = await getWalletBrief(wallet, { ai: ai !== '0' && ai !== 'false' });
    return ok(c, brief);
  } catch (e) {
    return fail(c, 'BRIEF_FAILED', e instanceof Error ? e.message : 'brief failed', 502);
  }
});
