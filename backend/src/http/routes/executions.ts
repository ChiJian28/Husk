import { Hono } from 'hono';
import { z } from 'zod';
import { jsonBody } from '../validate.js';
import { verifyFillOnChain } from '../../execution/verifyFill.js';
import { getQuoteRow } from '../../coverage/repo.js';
import { persistVerifiedExecution } from '../../coverage/service.js';
import { fail, ok } from '../request.js';
import type { AppVars } from '../request.js';

export const executionRoutes = new Hono<AppVars>().post(
  '/executions/verify',
  jsonBody(
    z.object({
      txHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/),
      quoteId: z.string(),
      wallet: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
    }),
  ),
  async (c) => {
    const body = c.req.valid('json');
    const row = await getQuoteRow(body.quoteId);
    if (!row) return fail(c, 'NOT_FOUND', 'quote not found', 404);
    const v = await verifyFillOnChain({ txHash: body.txHash, wallet: body.wallet });
    if (!v.ok) return fail(c, 'VERIFY_FAILED', v.reason, 400);
    const persisted = await persistVerifiedExecution({
      quote: row.quote,
      wallet: body.wallet,
      txHash: body.txHash,
      verification: v,
    });
    return ok(c, {
      coverageId: persisted.coverageId,
      status: persisted.status,
      verification: v,
      next:
        v.kind === 'rfq_requested'
          ? `RFQ open as quotation ${v.quotationId}. Poll POST /v1/coverages/${persisted.coverageId}/settle-plan (or /v1/jobs/watch-rfqs) for early-settle calldata.`
          : v.kind === 'rfq_cancelled'
            ? 'RFQ cancelled. USDC reserve returned to the wallet.'
            : 'Coverage active.',
    });
  },
);
