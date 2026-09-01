import { Hono } from 'hono';
import { CoverageIntentSchema } from '../../types/policy.js';
import { jsonBody } from '../validate.js';
import { HuskError } from '../../errors.js';
import { quote } from '../../underwriter/service.js';
import { getQuoteRow } from '../../coverage/repo.js';
import { buildExecutionPlan } from '../../execution/encode.js';
import { fail, ok } from '../request.js';
import type { AppVars } from '../request.js';

function failCaught(c: Parameters<typeof fail>[0], e: unknown, fallback: string) {
  if (e instanceof HuskError) {
    const status = e.status as 400 | 401 | 403 | 404 | 409 | 429 | 451 | 500 | 502;
    return fail(c, e.code, e.message, status);
  }
  return fail(c, fallback, e instanceof Error ? e.message : fallback, 502);
}

export const quoteRoutes = new Hono<AppVars>()
  .post('/quotes', jsonBody(CoverageIntentSchema), async (c) => {
    try {
      const intent = c.req.valid('json');
      const q = await quote(intent);
      return ok(c, { quote: q });
    } catch (e) {
      return failCaught(c, e, 'QUOTE_FAILED');
    }
  })
  .get('/quotes/:id', async (c) => {
    const row = await getQuoteRow(c.req.param('id'));
    if (!row) return fail(c, 'NOT_FOUND', 'quote not found', 404);
    return ok(c, { quote: row.quote, status: row.status });
  })
  .post('/quotes/:id/plan', async (c) => {
    const row = await getQuoteRow(c.req.param('id'));
    if (!row) return fail(c, 'NOT_FOUND', 'quote not found', 404);
    try {
      const plan = await buildExecutionPlan(row.quote);
      return ok(c, { plan });
    } catch (e) {
      return failCaught(c, e, 'PLAN_FAILED');
    }
  });
