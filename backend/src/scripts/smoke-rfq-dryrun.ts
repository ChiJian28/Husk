import { getQuoteRow } from '../coverage/repo.js';
import { quote } from '../underwriter/service.js';
import { buildExecutionPlan } from '../execution/encode.js';
import { getShelf } from '../calendar/service.js';
import { pickUpcomingEvent } from '../calendar/pick.js';
import { env } from '../config.js';

const qi = process.argv.indexOf('--quote');
let id = qi >= 0 ? process.argv[qi + 1] : undefined;
if (!id) {
  const wallet = (env.operatorAddress ?? '0x0000000000000000000000000000000000000001') as `0x${string}`;
  const events = await getShelf();
  const q = await quote({
    wallet,
    asset: 'ETH',
    eventId: pickUpcomingEvent(events, 'ETH')?.id,
    maxDrawdownPct: 10,
    coverageFraction: 1,
    maxPremiumUsdc: 1,
  });
  id = q.id;
  console.log('built quote', id, q.route, q.event.name);
}
const row = await getQuoteRow(id);
if (!row) {
  console.error('quote missing');
  process.exit(1);
}
const plan = await buildExecutionPlan(row.quote);
console.log(
  JSON.stringify(
    {
      quoteId: plan.quoteId,
      spender: plan.spender,
      approveAmountUsdc: plan.approveAmountUsdc,
      calls: plan.calls.map((c) => ({ to: c.to, data: c.data.slice(0, 18) + '…', description: c.description })),
    },
    null,
    2,
  ),
);
console.log('dry-run only — not sent');
