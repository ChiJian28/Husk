import 'dotenv/config';
import { serve } from '@hono/node-server';
import { Cron } from 'croner';
import { env } from './config.js';
import { logger } from './logger.js';
import { createApp } from './app.js';
import { getProvider, getReadClient } from './thetanuts/client.js';
import { syncCalendar } from './calendar/service.js';
import { readBrokerFeeBps } from './broker/partnerFee.js';
import { syncCalendarJob } from './jobs/syncCalendar.js';
import { watchRfqJob } from './jobs/watchRfqOffers.js';
import { settlementKeeperJob } from './jobs/settlementKeeper.js';

if (env.encodeOnly) {
  logger.warn('booting encode-only: THETANUTS_PRIVATE_KEY missing');
}

if (env.NODE_ENV === 'production' && env.partnerBrokerAddress) {
  const onchain = await readBrokerFeeBps(getProvider(), env.partnerBrokerAddress);
  if (Number(onchain) !== env.PARTNER_BROKER_FEE_BPS) {
    logger.fatal(
      { onchain: onchain.toString(), env: env.PARTNER_BROKER_FEE_BPS },
      'PARTNER_BROKER_FEE_BPS mismatch vs chain feeBps()',
    );
    process.exit(1);
  }
}

const app = createApp();

try {
  await getReadClient();
  logger.info({ chain: env.CHAIN_ID }, 'thetanuts read client ready');
} catch (e) {
  logger.warn({ err: e instanceof Error ? e.message : e }, 'thetanuts client init warning');
}

try {
  await syncCalendar();
} catch (e) {
  logger.warn({ err: e instanceof Error ? e.message : e }, 'boot calendar sync failed');
}

if (env.enableInprocessCron) {
  new Cron(`0 */${env.CALENDAR_SYNC_MINUTES} * * * *`, () => {
    syncCalendarJob().catch((e) => logger.warn(e, 'cron calendar'));
  });
  new Cron('*/30 * * * * *', () => {
    watchRfqJob().catch((e) => logger.warn(e, 'cron rfq'));
  });
  new Cron('0 */12 * * * *', () => {
    settlementKeeperJob().catch((e) => logger.warn(e, 'cron settle'));
  });
  logger.info('in-process cron enabled');
}

serve({ fetch: app.fetch, port: env.PORT }, (info) => {
  logger.info({ port: info.port }, 'husk backend listening');
});
