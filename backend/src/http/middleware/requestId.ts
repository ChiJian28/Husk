import { createMiddleware } from 'hono/factory';
import { requestId } from '../request.js';
import type { AppVars } from '../request.js';

export const requestIdMw = createMiddleware<AppVars>(async (c, next) => {
  c.set('requestId', requestId());
  await next();
});
