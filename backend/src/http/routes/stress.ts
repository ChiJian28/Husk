import { Hono } from 'hono';
import { z } from 'zod';
import { getQuoteRow } from '../../coverage/repo.js';
import { stressPayoffFromQuote, stressPointAtDrawdown } from '../../underwriter/stressPayoff.js';
import { fail, ok } from '../request.js';
import type { AppVars } from '../request.js';

const StressQuerySchema = z.object({
  drawdownPct: z.coerce.number().min(-80).max(20).optional(),
  minDrawdownPct: z.coerce.number().min(-80).max(0).optional(),
  maxDrawdownPct: z.coerce.number().min(-80).max(20).optional(),
  steps: z.coerce.number().int().min(10).max(100).optional(),
});

export const stressRoutes = new Hono<AppVars>().get('/quotes/:id/stress', async (c) => {
  const row = await getQuoteRow(c.req.param('id'));
  if (!row) return fail(c, 'NOT_FOUND', 'quote not found', 404);

  const parsed = StressQuerySchema.safeParse({
    drawdownPct: c.req.query('drawdownPct'),
    minDrawdownPct: c.req.query('minDrawdownPct'),
    maxDrawdownPct: c.req.query('maxDrawdownPct'),
    steps: c.req.query('steps'),
  });
  if (!parsed.success) return fail(c, 'VALIDATION', parsed.error.message, 400);

  const { drawdownPct, minDrawdownPct, maxDrawdownPct, steps } = parsed.data;
  const min = minDrawdownPct ?? -50;
  const max = maxDrawdownPct ?? 0;
  if (min > max) return fail(c, 'VALIDATION', 'minDrawdownPct must be ≤ maxDrawdownPct', 400);

  const quote = row.quote;
  const series = stressPayoffFromQuote(quote, {
    minDrawdownPct: min,
    maxDrawdownPct: max,
    steps: steps ?? 50,
  });

  const at =
    drawdownPct !== undefined
      ? stressPointAtDrawdown(quote, Math.min(max, Math.max(min, drawdownPct)))
      : undefined;

  return ok(c, {
    quoteId: quote.id,
    asset: quote.intent.asset ?? 'ETH',
    spot: quote.spot,
    deductiblePct: quote.deductiblePct,
    protectionActivatesBelowDrawdownPct: -quote.deductiblePct,
    protectedNotionalAsset: quote.bag.protectedNotionalAsset,
    totalDebitUsdc: quote.totalDebitUsdc,
    maxPayoutUsdc: quote.maxPayoutUsdc,
    series,
    ...(at ? { at } : {}),
  });
});
