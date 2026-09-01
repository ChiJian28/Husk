import { env } from '../config.js';
import { getReadClient } from '../thetanuts/client.js';
import { fromUsdc } from '../thetanuts/decimals.js';
import { listDueCoverages, updateCoverage } from '../coverage/repo.js';
import { observeSettlement } from './settlementObserve.js';

export async function settlementKeeperJob() {
  const now = Math.floor(Date.now() / 1000);
  const due = await listDueCoverages(now);
  const results = [];
  const client = getReadClient();

  for (const row of due) {
    const option = row.option_address as string | null;
    if (!option) {
      results.push({ id: row.id, skip: 'no option address' });
      continue;
    }
    try {
      const full = await client.option.getFullOptionInfo(option);
      const expired = full.isExpired === true || (await client.option.isExpired(option));
      const settled = full.isSettled === true || (await client.option.isSettled(option));
      let payoutUsdc = '0';
      try {
        const p = await client.option.calculatePayout(option, 0n);
        payoutUsdc = fromUsdc(p.payout);
      } catch {
        /* view may need a TWAP price; zero is an honest unknown */
      }
      const obs = observeSettlement({ expired, settled, payoutUsdc });
      if (obs.action === 'record') {
        await updateCoverage(row.id as string, { status: obs.status });
      }
      results.push({
        id: row.id,
        expired,
        settled,
        payoutUsdc,
        action: obs.action,
        status: obs.status,
        note: obs.note,
      });
    } catch (e) {
      results.push({ id: row.id, error: e instanceof Error ? e.message : String(e) });
    }
  }
  return { operator: env.operatorAddress, due: due.length, results };
}
