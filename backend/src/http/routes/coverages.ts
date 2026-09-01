import { Hono } from 'hono';
import { getCoverageById, listCoverages } from '../../coverage/service.js';
import { watchOpenRfq } from '../../rfq/machine.js';
import { fail, ok } from '../request.js';
import type { AppVars } from '../request.js';

export const coverageRoutes = new Hono<AppVars>()
  .post('/coverages/:id/settle-plan', async (c) => {
    const id = c.req.param('id');
    const row = await getCoverageById(id);
    if (!row) return fail(c, 'NOT_FOUND', 'coverage not found', 404);
    if (row.route !== 'RFQ') return fail(c, 'NOT_RFQ', 'coverage is not an RFQ', 400);
    const watched = await watchOpenRfq({
      id: row.id as string,
      wallet: row.wallet as string,
      quotation_id: (row.quotation_id as string) ?? null,
      reserveUsdc: (row.premium_usdc_onchain as string | null) ?? null,
      quote_id: (row.quote_id as string | null) ?? null,
    });
    return ok(c, { coverageId: id, ...watched });
  })
  .get('/coverages/:wallet', async (c) => {
    const wallet = c.req.param('wallet');
    if (!/^0x[a-fA-F0-9]{40}$/.test(wallet)) return fail(c, 'BAD_WALLET', 'invalid address');
    const rows = await listCoverages(wallet);
    return ok(c, { coverages: rows });
  });
