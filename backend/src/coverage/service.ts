import { randomUUID } from 'node:crypto';
import type { PolicyQuote, QuoteStatus } from '../types/policy.js';
import type { FillVerifyOk } from '../execution/verifyFill.js';
import { bindQuotationId } from '../rfq/keys.js';
import {
  getCoverageById,
  getCoverageByOpenTx,
  getCoverageByQuotationId,
  insertCoverage,
  listCoverages,
  updateCoverage,
  updateQuoteStatus,
} from './repo.js';

export async function listActiveCoverages(wallet: string, asset: string) {
  const rows = await listCoverages(wallet);
  return rows.filter((r) => r.status === 'active' && r.asset === asset);
}

export { listCoverages, getCoverageById };

function quoteStatusFor(kind: FillVerifyOk['kind']): QuoteStatus {
  if (kind === 'rfq_requested') return 'rfq_open';
  return 'active';
}

function coverageStatusFor(kind: FillVerifyOk['kind']): QuoteStatus {
  if (kind === 'rfq_requested') return 'rfq_open';
  return 'active';
}

export async function persistVerifiedExecution(opts: {
  quote: PolicyQuote;
  wallet: string;
  txHash: string;
  verification: FillVerifyOk;
}): Promise<{ coverageId: string; status: QuoteStatus }> {
  const v = opts.verification;
  const wallet = opts.wallet.toLowerCase();
  const txHash = opts.txHash.toLowerCase();
  const status = coverageStatusFor(v.kind);

  const existing =
    (v.quotationId ? await getCoverageByQuotationId(v.quotationId) : null) ??
    (await getCoverageByOpenTx(txHash));

  const patch = {
    status,
    route: v.route,
    option_address: v.optionAddress ?? null,
    quotation_id: v.quotationId ?? existing?.quotation_id ?? null,
    open_tx: existing?.open_tx ?? txHash,
    settle_tx: v.kind === 'rfq_settled' ? txHash : existing?.settle_tx ?? null,
    premium_usdc_onchain:
      v.premiumUsdc !== '0' ? v.premiumUsdc : ((existing?.premium_usdc_onchain as string | undefined) ?? v.premiumUsdc),
    verified: true,
    updated_at: new Date().toISOString(),
  };

  if (existing?.id) {
    await updateCoverage(existing.id as string, patch);
    await updateQuoteStatus(opts.quote.id, quoteStatusFor(v.kind));
    if (v.kind === 'rfq_requested' && v.quotationId) {
      await bindQuotationId(wallet, v.quotationId, '');
    }
    return { coverageId: existing.id as string, status };
  }

  const id = randomUUID();
  await insertCoverage({
    id,
    quote_id: opts.quote.id,
    wallet,
    asset: opts.quote.intent.asset,
    event_id: opts.quote.event.id,
    structure: opts.quote.structure,
    broker_fee_usdc: opts.quote.brokerFeeUsdc,
    max_payout_usdc: opts.quote.maxPayoutUsdc,
    expiry_unix: opts.quote.expiryUnix,
    created_at: new Date().toISOString(),
    ...patch,
  });
  await updateQuoteStatus(opts.quote.id, quoteStatusFor(v.kind));
  if (v.kind === 'rfq_requested' && v.quotationId) {
    await bindQuotationId(wallet, v.quotationId, '');
  }
  return { coverageId: id, status };
}
