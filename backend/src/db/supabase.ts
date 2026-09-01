import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import ws from 'ws';
import { env } from '../config.js';
import { logger } from '../logger.js';

let service: SupabaseClient | undefined;

export function getServiceClient(): SupabaseClient {
  if (!service) {
    service = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      // Node 20 has no native WebSocket; supabase-js Realtime needs `ws`.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      realtime: { transport: ws as any },
    });
  }
  return service;
}

export async function pingSupabase(): Promise<{ ok: boolean; error?: string }> {
  try {
    const { error } = await getServiceClient().from('calendar_events').select('id').limit(1);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    logger.warn({ err: msg }, 'supabase ping failed');
    return { ok: false, error: msg };
  }
}
