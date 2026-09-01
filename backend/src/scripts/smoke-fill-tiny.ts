import { quote } from '../underwriter/service.js';
import { buildExecutionPlan } from '../execution/encode.js';
import { runAutonomous } from '../execution/autonomous.js';
import { verifyFillOnChain } from '../execution/verifyFill.js';
import { getShelf } from '../calendar/service.js';
import { pickUpcomingEvent } from '../calendar/pick.js';
import { env } from '../config.js';

if (!process.argv.includes('--i-understand-mainnet')) {
  console.error('Refusing to send. Pass --i-understand-mainnet to spend real USDC on Base.');
  process.exit(1);
}
if (!env.privateKey || !env.operatorAddress) {
  console.error('need THETANUTS_PRIVATE_KEY + HUSK_OPERATOR_ADDRESS');
  process.exit(1);
}

const events = await getShelf();
const ev = pickUpcomingEvent(events, 'ETH');
console.log('human-gated mainnet send; max 1 USDC + gas. event=', ev?.name);
const q = await quote({
  wallet: env.operatorAddress,
  asset: 'ETH',
  eventId: ev?.id,
  maxDrawdownPct: 10,
  coverageFraction: 1,
  maxPremiumUsdc: 1,
});
console.log('quote', q.id, q.route, q.totalDebitUsdc, q.structure);
const plan = await buildExecutionPlan(q);
const { hashes } = await runAutonomous(q, plan);
console.log('sent', hashes);
const last = hashes.at(-1);
if (last) {
  const v = await verifyFillOnChain({ txHash: last, wallet: env.operatorAddress });
  console.log('verify', v);
}
