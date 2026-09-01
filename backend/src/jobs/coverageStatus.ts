import { listDueCoverages, updateCoverage } from '../coverage/repo.js';

export async function coverageStatusJob() {
  const now = Math.floor(Date.now() / 1000);
  const due = await listDueCoverages(now);
  let marked = 0;
  for (const row of due) {
    if (row.status === 'active' && !row.payout_tx && !row.option_address) {
      await updateCoverage(row.id as string, { status: 'expired_unpaid' });
      marked += 1;
    }
  }
  return { marked };
}
