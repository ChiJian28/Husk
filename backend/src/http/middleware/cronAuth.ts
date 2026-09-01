import { createMiddleware } from 'hono/factory';
import { env } from '../../config.js';
import { fail } from '../request.js';
import type { AppVars } from '../request.js';

export const cronAuth = createMiddleware<AppVars>(async (c, next) => {
  const hdr = c.req.header('authorization') ?? '';
  const token = hdr.startsWith('Bearer ') ? hdr.slice(7) : '';
  if (token !== env.CRON_SECRET) {
    return fail(c, 'UNAUTHORIZED', 'invalid cron secret', 401);
  }
  await next();
});
