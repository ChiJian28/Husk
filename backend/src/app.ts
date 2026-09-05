import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { allowedCorsOrigin } from './config.js';
import { HuskError } from './errors.js';
import { logger } from './logger.js';
import { requestIdMw } from './http/middleware/requestId.js';
import { geoBlock } from './http/middleware/geo.js';
import { healthRoutes, liveRoutes } from './http/routes/health.js';
import { briefRoutes } from './http/routes/brief.js';
import { calendarRoutes } from './http/routes/calendar.js';
import { holdingsRoutes } from './http/routes/holdings.js';
import { quoteRoutes } from './http/routes/quotes.js';
import { agentRoutes } from './http/routes/agent.js';
import { executionRoutes } from './http/routes/executions.js';
import { coverageRoutes } from './http/routes/coverages.js';
import { jobRoutes } from './http/routes/jobs.js';
import { feeRoutes } from './http/routes/fees.js';
import { stressRoutes } from './http/routes/stress.js';
import type { AppVars } from './http/request.js';
import { fail } from './http/request.js';

export function createApp() {
  const app = new Hono<AppVars>();
  app.use('*', requestIdMw);
  app.use(
    '*',
    cors({
      origin: (origin) => allowedCorsOrigin(origin),
      allowHeaders: ['Content-Type', 'Authorization', 'Accept'],
      allowMethods: ['GET', 'POST', 'OPTIONS'],
      maxAge: 86400,
    }),
  );
  app.use('*', geoBlock);
  app.route('/', liveRoutes);

  const v1 = new Hono<AppVars>();
  v1.route('/', healthRoutes);
  v1.route('/', briefRoutes);
  v1.route('/', calendarRoutes);
  v1.route('/', holdingsRoutes);
  v1.route('/', quoteRoutes);
  v1.route('/', agentRoutes);
  v1.route('/', executionRoutes);
  v1.route('/', coverageRoutes);
  v1.route('/', jobRoutes);
  v1.route('/', feeRoutes);
  v1.route('/', stressRoutes);
  app.route('/v1', v1);

  app.notFound((c) => fail(c, 'NOT_FOUND', 'not found', 404));
  app.onError((err, c) => {
    logger.error({ err: err.message, stack: err.stack }, 'unhandled');
    if (err instanceof HuskError) {
      const status = err.status as 400 | 401 | 403 | 404 | 409 | 429 | 451 | 500 | 502;
      return fail(c, err.code, err.message, status);
    }
    return fail(c, 'INTERNAL', err.message, 500);
  });
  return app;
}
