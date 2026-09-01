import type { Context } from 'hono';
import { randomUUID } from 'node:crypto';

export type AppVars = { Variables: { requestId: string } };

export function requestId(): string {
  return randomUUID();
}

export function ok(c: Context<AppVars>, data: unknown, status: 200 | 201 = 200) {
  const body = { requestId: c.get('requestId'), ...((data && typeof data === 'object') ? (data as object) : { data }) };
  return c.json(body, status);
}

export function fail(
  c: Context<AppVars>,
  code: string,
  message: string,
  status: 400 | 401 | 403 | 404 | 409 | 429 | 451 | 500 | 502 = 400,
) {
  return c.json({ requestId: c.get('requestId'), error: { code, message } }, status);
}
