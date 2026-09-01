import { createMiddleware } from 'hono/factory';
import { fail } from '../request.js';
import type { AppVars } from '../request.js';

const hits = new Map<string, { n: number; reset: number }>();

export function agentRateLimit(max = 20, windowMs = 60_000) {
  return createMiddleware<AppVars>(async (c, next) => {
    const ip = c.req.header('x-forwarded-for')?.split(',')[0]?.trim() || 'local';
    const now = Date.now();
    const slot = hits.get(ip);
    if (!slot || now > slot.reset) {
      hits.set(ip, { n: 1, reset: now + windowMs });
      await next();
      return;
    }
    slot.n += 1;
    if (slot.n > max) return fail(c, 'RATE_LIMIT', 'too many agent turns', 429);
    await next();
  });
}
