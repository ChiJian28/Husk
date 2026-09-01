import { z } from 'zod';
import 'dotenv/config';

const address = z
  .string()
  .regex(/^0x[a-fA-F0-9]{40}$/, 'expected 0x-prefixed address')
  .transform((s) => s.toLowerCase() as `0x${string}`);

const optionalAddress = z
  .string()
  .optional()
  .transform((s) => {
    if (!s || s.trim() === '') return undefined;
    const v = s.trim();
    if (!/^0x[a-fA-F0-9]{40}$/.test(v)) {
      throw new Error(`invalid address: ${v.slice(0, 10)}…`);
    }
    return v.toLowerCase() as `0x${string}`;
  });

function envBool(v: string | undefined, fallback = false): boolean {
  if (v == null || v === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(v.toLowerCase());
}

function normalizePrivateKey(raw: string | undefined): `0x${string}` | undefined {
  if (!raw || raw.includes('REPLACE')) return undefined;
  const hex = raw.startsWith('0x') ? raw.slice(2) : raw;
  if (!/^[a-fA-F0-9]{64}$/.test(hex)) {
    throw new Error('THETANUTS_PRIVATE_KEY must be 32-byte hex');
  }
  return `0x${hex}` as `0x${string}`;
}

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(8787),
  APP_URL: z.string().default('http://localhost:8787'),
  CORS_ORIGINS: z
    .string()
    .default(
      'http://localhost:3000,http://127.0.0.1:3000,http://localhost:5173,http://127.0.0.1:5173',
    ),
  LOG_LEVEL: z.string().default('info'),
  CHAIN_ID: z.coerce.number().int(),
  THETANUTS_RPC_URL: z.string().url(),
  BASESCAN_TX_BASE: z.string().default('https://basescan.org/tx/'),
  THETANUTS_CALENDAR_URL: z.string().url().default('https://calendar.thetanuts.finance/v1/report.json'),
  THETANUTS_API_BASE_URL: z.string().optional(),
  THETANUTS_INDEXER_API_URL: z.string().optional(),
  THETANUTS_STATE_API_URL: z.string().optional(),
  THETANUTS_PRICING_API_URL: z.string().optional(),
  THETANUTS_WS_URL: z.string().optional(),
  GEMINI_API_KEY: z.string().min(8),
  GEMINI_MODEL: z.string().min(1),
  GEMINI_FALLBACK_MODEL: z.string().min(1),
  LANGCHAIN_API_KEY: z.string().min(8),
  LANGCHAIN_PROJECT: z.string().default('husk'),
  LANGCHAIN_ENDPOINT: z.string().default('https://api.smith.langchain.com'),
  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(8),
  SUPABASE_DB_URL: z.string().min(20),
  HUSK_ENCRYPTION_MASTER_KEY: z.string().regex(/^[a-fA-F0-9]{64}$/, '64 hex chars (32 bytes)'),
  CRON_SECRET: z.string().min(16),
  CALENDAR_SYNC_MINUTES: z.coerce.number().int().positive().default(60),
  AGENT_MAX_NOTIONAL_USDC: z.coerce.bigint().default(3_000_000n),
  PARTNER_BROKER_FEE_BPS: z.coerce.number().int().min(0).max(9999).default(10),
  RFQ_REFERRAL_ID: z.string().optional(),
  BLOCKED_COUNTRIES: z.string().default(''),
  DERIBIT_WS_URL: z.string().optional(),
});

export type AppConfig = z.infer<typeof EnvSchema> & {
  corsOrigins: string[];
  blockedCountries: string[];
  huskForceRfq: boolean;
  huskJobsSend: boolean;
  enableInprocessCron: boolean;
  privateKey?: `0x${string}`;
  operatorAddress?: `0x${string}`;
  partnerBrokerAddress?: `0x${string}`;
  referrerAddress?: `0x${string}`;
  encodeOnly: boolean;
};

let cached: AppConfig | undefined;

export function loadConfig(): AppConfig {
  if (cached) return cached;
  const parsed = EnvSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('\n');
    console.error('Invalid environment:\n' + issues);
    process.exit(1);
  }
  const e = parsed.data;
  if (e.CHAIN_ID !== 8453) {
    console.error(`CHAIN_ID must be 8453 (Base mainnet). Got ${e.CHAIN_ID}`);
    process.exit(1);
  }

  const privateKey = normalizePrivateKey(process.env.THETANUTS_PRIVATE_KEY);
  const operatorAddress = optionalAddress.parse(process.env.HUSK_OPERATOR_ADDRESS);
  const partnerBrokerAddress = optionalAddress.parse(process.env.PARTNER_BROKER_ADDRESS);
  const referrerRaw = optionalAddress.parse(process.env.REFERRER_ADDRESS);
  const referrerAddress =
    referrerRaw && referrerRaw !== '0x0000000000000000000000000000000000000000'
      ? referrerRaw
      : undefined;

  if (e.NODE_ENV === 'production' && !operatorAddress) {
    console.error('HUSK_OPERATOR_ADDRESS is required in production');
    process.exit(1);
  }

  cached = {
    ...e,
    corsOrigins: e.CORS_ORIGINS.split(',').map((s) => s.trim()).filter(Boolean),
    blockedCountries: e.BLOCKED_COUNTRIES.split(',')
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean),
    huskForceRfq: envBool(process.env.HUSK_FORCE_RFQ, false),
    huskJobsSend: envBool(process.env.HUSK_JOBS_SEND, false),
    enableInprocessCron: envBool(process.env.ENABLE_INPROCESS_CRON, false),
    privateKey,
    operatorAddress,
    partnerBrokerAddress,
    referrerAddress,
    encodeOnly: !privateKey,
  };
  return cached;
}

export const env = loadConfig();
export { address as addressSchema };

const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1']);

export function allowedCorsOrigin(requestOrigin: string | undefined): string {
  if (!requestOrigin) return '';
  if (env.corsOrigins.includes(requestOrigin)) return requestOrigin;
  if (env.NODE_ENV === 'production') return '';
  try {
    const u = new URL(requestOrigin);
    if ((u.protocol === 'http:' || u.protocol === 'https:') && LOOPBACK_HOSTS.has(u.hostname)) {
      return requestOrigin;
    }
  } catch {
    return '';
  }
  return '';
}
