import { listOpenRfqs } from '../coverage/repo.js';
import { watchOpenRfq } from '../rfq/machine.js';

export async function watchRfqJob() {
  const rows = await listOpenRfqs();
  const results = [];
  for (const row of rows) {
    results.push({
      id: row.id,
      ...(await watchOpenRfq({
        id: row.id as string,
        wallet: row.wallet as string,
        quotation_id: (row.quotation_id as string) ?? null,
        reserveUsdc: (row.premium_usdc_onchain as string | null) ?? null,
        quote_id: (row.quote_id as string | null) ?? null,
      })),
    });
  }
  return { scanned: rows.length, results };
}
