import { createMiddleware } from 'hono/factory';
import { env } from '../../config.js';
import { fail } from '../request.js';
import type { AppVars } from '../request.js';

const GEO_SKIP = new Set(['/health', '/ping', '/v1/health']);

export const geoBlock = createMiddleware<AppVars>(async (c, next) => {
  if (GEO_SKIP.has(c.req.path) || env.blockedCountries.length === 0) {
    await next();
    return;
  }
  const cc = (c.req.header('cf-ipcountry') ?? c.req.header('x-vercel-ip-country') ?? '').toUpperCase();
  if (cc && env.blockedCountries.includes(cc)) {
    return fail(c, 'RESTRICTED', 'service not available in your region', 451);
  }
  await next();
});
