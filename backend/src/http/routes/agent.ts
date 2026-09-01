import { Hono } from 'hono';
import { z } from 'zod';
import { jsonBody } from '../validate.js';
import { env } from '../../config.js';
import { runTurn } from '../../agent/graph.js';
import { buildExecutionPlan } from '../../execution/encode.js';
import { runAutonomous } from '../../execution/autonomous.js';
import { verifyFillOnChain } from '../../execution/verifyFill.js';
import { persistVerifiedExecution } from '../../coverage/service.js';
import { toUsdc } from '../../thetanuts/decimals.js';
import { agentRateLimit } from '../middleware/rateLimit.js';
import { fail, ok } from '../request.js';
import type { AppVars } from '../request.js';

const turnSchema = z.object({
  wallet: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  utterance: z.string().min(1).max(2000),
  threadId: z.string().optional(),
});

const autoSchema = z.object({
  wallet: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  utterance: z.string().min(1).max(2000),
  maxNotionalUsdc: z.number().positive().optional(),
});

export const agentRoutes = new Hono<AppVars>()
  .post('/agent/turn', agentRateLimit(), jsonBody(turnSchema), async (c) => {
    const body = c.req.valid('json');
    try {
      const out = await runTurn(body);
      return ok(c, out);
    } catch (e) {
      return fail(c, 'AGENT_FAILED', e instanceof Error ? e.message : 'agent failed', 502);
    }
  })
  .post('/agent/autonomous', agentRateLimit(), jsonBody(autoSchema), async (c) => {
    if (!env.privateKey) return fail(c, 'NO_SIGNER', 'encode-only mode', 400);
    const body = c.req.valid('json');
    const cap = body.maxNotionalUsdc ?? Number(env.AGENT_MAX_NOTIONAL_USDC) / 1e6;
    if (cap > Number(env.AGENT_MAX_NOTIONAL_USDC) / 1e6 + 1e-9) {
      return fail(c, 'CAP', 'maxNotional exceeds env cap', 403);
    }
    try {
      const turn = await runTurn({ wallet: body.wallet, utterance: body.utterance });
      if (turn.refusal || turn.clarify || !turn.quote) return ok(c, turn);
      const debit = toUsdc(turn.quote.totalDebitUsdc);
      if (debit > env.AGENT_MAX_NOTIONAL_USDC) {
        return fail(c, 'SAFETY_LIMITS_REQUIRED', 'quote exceeds autonomous cap', 403);
      }
      const plan = turn.plan ?? (await buildExecutionPlan(turn.quote));
      const { hashes } = await runAutonomous(turn.quote, plan);
      const last = hashes.at(-1);
      let coverage: { coverageId: string; status: string } | undefined;
      if (last) {
        const v = await verifyFillOnChain({ txHash: last, wallet: body.wallet });
        if (v.ok) {
          coverage = await persistVerifiedExecution({
            quote: turn.quote,
            wallet: body.wallet,
            txHash: last,
            verification: v,
          });
        }
      }
      return ok(c, { ...turn, hashes, coverage });
    } catch (e) {
      return fail(c, 'AUTO_FAILED', e instanceof Error ? e.message : 'autonomous failed', 502);
    }
  });
