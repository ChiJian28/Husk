import { getServiceClient } from '../db/supabase.js';
import { HuskError } from '../errors.js';
import { logger } from '../logger.js';
import type { PolicyQuote, QuoteStatus } from '../types/policy.js';

const quoteMem = new Map<string, { quote: PolicyQuote; status: QuoteStatus }>();

export async function persistQuote(quote: PolicyQuote, status: QuoteStatus = 'quoted'): Promise<void> {
  quoteMem.set(quote.id, { quote, status });
  const db = getServiceClient();
  const { error } = await db.from('quotes').upsert({
    id: quote.id,
    wallet: quote.intent.wallet,
    status,
    intent: quote.intent,
    quote,
    route: quote.route,
    structure: quote.structure,
    expiry_unix: quote.expiryUnix,
    created_at: quote.createdAt,
  });
  if (error) logger.warn({ err: error.message, id: quote.id }, 'quote persist failed');
}

export async function getQuoteRow(id: string): Promise<{ quote: PolicyQuote; status: QuoteStatus } | null> {
  const mem = quoteMem.get(id);
  if (mem) return mem;
  const { data, error } = await getServiceClient().from('quotes').select('quote,status').eq('id', id).maybeSingle();
  if (error || !data) return null;
  return { quote: data.quote as PolicyQuote, status: data.status as QuoteStatus };
}

export async function updateQuoteStatus(id: string, status: QuoteStatus): Promise<void> {
  const mem = quoteMem.get(id);
  if (mem) quoteMem.set(id, { ...mem, status });
  await getServiceClient().from('quotes').update({ status }).eq('id', id);
}

export async function insertCoverage(row: Record<string, unknown>): Promise<void> {
  const { error } = await getServiceClient().from('coverages').insert(row);
  if (error) throw new HuskError('DB_WRITE', `coverage insert failed: ${error.message}`, 502);
}

export async function updateCoverage(id: string, patch: Record<string, unknown>): Promise<void> {
  const { error } = await getServiceClient()
    .from('coverages')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw new HuskError('DB_WRITE', `coverage update failed: ${error.message}`, 502);
}

export async function listCoverages(wallet: string) {
  const { data, error } = await getServiceClient()
    .from('coverages')
    .select('*')
    .eq('wallet', wallet.toLowerCase())
    .order('created_at', { ascending: false });
  if (error) {
    logger.warn({ err: error.message }, 'list coverages failed');
    return [];
  }
  return data ?? [];
}

export async function listDueCoverages(nowUnix: number) {
  const { data, error } = await getServiceClient()
    .from('coverages')
    .select('*')
    .eq('status', 'active')
    .lte('expiry_unix', nowUnix - 60);
  if (error) {
    logger.warn({ err: error.message }, 'due coverages query failed');
    return [];
  }
  return data ?? [];
}

export async function listOpenRfqs() {
  const { data, error } = await getServiceClient()
    .from('coverages')
    .select('*')
    .in('status', ['rfq_open', 'awaiting_signature'])
    .eq('route', 'RFQ');
  if (error) return [];
  return data ?? [];
}

export async function insertFillVerification(row: Record<string, unknown>): Promise<void> {
  const { error } = await getServiceClient().from('fill_verifications').upsert(row, { onConflict: 'tx_hash' });
  if (error) logger.warn({ err: error.message }, 'fill_verifications upsert failed');
}

export async function insertAgentRun(row: Record<string, unknown>): Promise<void> {
  const { error } = await getServiceClient().from('agent_runs').insert(row);
  if (error) logger.warn({ err: error.message }, 'agent_runs insert failed');
}

export async function getCoverageById(id: string) {
  const { data, error } = await getServiceClient().from('coverages').select('*').eq('id', id).maybeSingle();
  if (error || !data) return null;
  return data;
}

export async function getCoverageByQuotationId(quotationId: string) {
  const { data, error } = await getServiceClient()
    .from('coverages')
    .select('*')
    .eq('quotation_id', quotationId)
    .order('created_at', { ascending: false })
    .limit(1);
  if (error || !data?.length) return null;
  return data[0]!;
}

export async function getCoverageByOpenTx(txHash: string) {
  const { data, error } = await getServiceClient()
    .from('coverages')
    .select('*')
    .eq('open_tx', txHash.toLowerCase())
    .maybeSingle();
  if (error || !data) return null;
  return data;
}

export async function findOpenRfq(wallet: string, eventId: string | undefined, expiryUnix: number) {
  let q = getServiceClient()
    .from('coverages')
    .select('*')
    .eq('wallet', wallet.toLowerCase())
    .eq('expiry_unix', expiryUnix)
    .in('status', ['rfq_open', 'awaiting_signature'])
    .order('created_at', { ascending: false })
    .limit(1);
  if (eventId) q = q.eq('event_id', eventId);
  const { data } = await q;
  return data?.[0] ?? null;
}
