import { env } from '../config.js';
import { logger } from '../logger.js';
import { getServiceClient } from '../db/supabase.js';
import { OfficialReportSchema, type OfficialReport } from './schema.js';

export async function fetchOfficialReport(): Promise<OfficialReport> {
  const res = await fetch(env.THETANUTS_CALENDAR_URL, {
    signal: AbortSignal.timeout(15_000),
    headers: { accept: 'application/json' },
  });
  if (!res.ok) {
    throw new Error(`calendar HTTP ${res.status}`);
  }
  const json: unknown = await res.json();
  return OfficialReportSchema.parse(json);
}

export async function persistSnapshot(report: OfficialReport): Promise<{
  snapshotId: string;
  stale: boolean;
  hardExpiryAt: string | null;
} | null> {
  const hard = report.run_meta?.hard_expiry_at ?? null;
  const stale = hard ? Date.now() > Date.parse(hard) : false;
  const db = getServiceClient();
  const { data, error } = await db
    .from('calendar_snapshots')
    .insert({
      fetched_at: new Date().toISOString(),
      report_date: report.run_meta?.report_date ?? null,
      hard_expiry_at: hard,
      horizon_days: report.run_meta?.horizon_days ?? 7,
      schema_version: String(report.schema_version ?? ''),
      raw: report,
      stale,
    })
    .select('id')
    .single();
  if (error) {
    logger.warn({ err: error.message }, 'calendar snapshot persist failed');
    return null;
  }
  return { snapshotId: data.id as string, stale, hardExpiryAt: hard };
}
