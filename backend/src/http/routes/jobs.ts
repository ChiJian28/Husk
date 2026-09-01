import { Hono } from 'hono';
import { cronAuth } from '../middleware/cronAuth.js';
import { syncCalendarJob } from '../../jobs/syncCalendar.js';
import { watchRfqJob } from '../../jobs/watchRfqOffers.js';
import { settlementKeeperJob } from '../../jobs/settlementKeeper.js';
import { coverageStatusJob } from '../../jobs/coverageStatus.js';
import { ok } from '../request.js';
import type { AppVars } from '../request.js';

export const jobRoutes = new Hono<AppVars>()
  .post('/jobs/sync-calendar', cronAuth, async (c) => ok(c, await syncCalendarJob()))
  .post('/jobs/watch-rfqs', cronAuth, async (c) => ok(c, await watchRfqJob()))
  .post('/jobs/settle', cronAuth, async (c) => ok(c, await settlementKeeperJob()))
  .post('/jobs/coverage-status', cronAuth, async (c) => ok(c, await coverageStatusJob()));
