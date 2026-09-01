import { quote } from '../underwriter/service.js';
import { getShelf } from '../calendar/service.js';
import { pickUpcomingEvent } from '../calendar/pick.js';
import { env } from '../config.js';

function arg(name: string, fallback?: string) {
  const i = process.argv.indexOf(`--${name}`);
  if (i >= 0 && process.argv[i + 1]) return process.argv[i + 1]!;
  return fallback;
}

const wallet = (arg('wallet', env.operatorAddress) ?? '').toLowerCase() as `0x${string}`;
if (!wallet.startsWith('0x')) {
  console.error('pass --wallet 0x...');
  process.exit(1);
}
const events = await getShelf();
const macro = pickUpcomingEvent(events, 'ETH');
const eventId = arg('event') ?? macro?.id;
const max = Number(arg('max', '3'));
const q = await quote({
  wallet,
  asset: 'ETH',
  eventId,
  maxDrawdownPct: 10,
  coverageFraction: 1,
  maxPremiumUsdc: max,
});
console.log(
  JSON.stringify(
    {
      id: q.id,
      event: q.event.name,
      expiryIso: q.expiryIso,
      expiryReason: q.expiryReason,
      structure: q.structure,
      strikesUsd: q.strikesUsd,
      route: q.route,
      premiumUsdc: q.premiumUsdc,
      brokerFeeUsdc: q.brokerFeeUsdc,
      totalDebitUsdc: q.totalDebitUsdc,
      maxPayoutUsdc: q.maxPayoutUsdc,
      maxLossUsdc: q.maxLossUsdc,
      warnings: q.warnings,
      payoffPoints: q.payoff.length,
    },
    null,
    2,
  ),
);
