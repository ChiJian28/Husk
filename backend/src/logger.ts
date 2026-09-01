import pino from 'pino';
import { env } from './config.js';

export const logger = pino({
  level: env.LOG_LEVEL,
  redact: {
    paths: [
      'THETANUTS_PRIVATE_KEY',
      'HUSK_ENCRYPTION_MASTER_KEY',
      'privateKey',
      'ciphertext',
      'req.headers.authorization',
      '*.privateKey',
      '*.ciphertext',
      'GEMINI_API_KEY',
      'LANGCHAIN_API_KEY',
      'SUPABASE_SERVICE_ROLE_KEY',
      'SUPABASE_ANON_KEY',
      'SUPABASE_DB_URL',
      'THETANUTS_RPC_URL',
      'CRON_SECRET',
    ],
    censor: '[redacted]',
  },
  transport:
    env.NODE_ENV === 'development'
      ? { target: 'pino-pretty', options: { colorize: true, translateTime: 'SYS:standard' } }
      : undefined,
});
