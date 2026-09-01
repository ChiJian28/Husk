import { Hono } from 'hono';
import { z } from 'zod';
import { jsonBody } from '../validate.js';
import { createCustomEvent, getFreshness, getShelf, syncCalendar } from '../../calendar/service.js';
import { AssetSchema } from '../../types/policy.js';
import { fail, ok } from '../request.js';
import type { AppVars } from '../request.js';

export const calendarRoutes = new Hono<AppVars>()
  .get('/calendar', async (c) => {
    const events = await getShelf();
    return ok(c, {
      events: events.map(({ officialThesis: _t, ...rest }) => rest),
      freshness: getFreshness(),
    });
  })
  .post('/calendar/sync', async (c) => {
    const r = await syncCalendar();
    return ok(c, r);
  })
  .post(
    '/calendar/custom',
    jsonBody(
      z.object({
        name: z.string().min(1),
        tsUtc: z.string(),
        assets: z.array(AssetSchema).optional(),
      }),
    ),
    async (c) => {
      try {
        const body = c.req.valid('json');
        const event = await createCustomEvent(body);
        return ok(c, { event });
      } catch (e) {
        return fail(c, 'BAD_CUSTOM', e instanceof Error ? e.message : 'failed', 400);
      }
    },
  );
