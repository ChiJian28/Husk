import { getQuoteRow } from '../coverage/repo.js';
import { previewToDryRun } from '../thetanuts/preview.js';
import { getReadClient } from '../thetanuts/client.js';
import { toUsdc } from '../thetanuts/decimals.js';
import type { BookOrderRef } from '../types/policy.js';

const i = process.argv.indexOf('--quote');
const id = i >= 0 ? process.argv[i + 1] : undefined;
if (!id) {
  console.error('--quote <uuid>');
  process.exit(1);
}
const row = await getQuoteRow(id);
if (!row) {
  console.error('quote not in memory/db — run smoke-quote in the same process or persist first');
  process.exit(1);
}
const q = row.quote;
if (q.route === 'OPTIONBOOK' && q.bookOrderRef) {
  const ref = q.bookOrderRef as BookOrderRef;
  const orders = await getReadClient().api.fetchOrders();
  const order = orders.find((o) => o.order.nonce.toString() === ref.nonce);
  if (!order) {
    console.log('order gone from book');
    process.exit(0);
  }
  console.log(JSON.stringify(previewToDryRun(order, toUsdc(q.premiumUsdc)), null, 2));
} else {
  console.log(JSON.stringify({ route: q.route, dryRun: q.dryRun }, null, 2));
}
