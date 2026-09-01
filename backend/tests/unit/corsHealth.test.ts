import { describe, expect, it } from 'vitest';
import { allowedCorsOrigin } from '../../src/config.js';
import { createApp } from '../../src/app.js';

describe('cors allowlist', () => {
  it('allows configured Next and Vite origins', () => {
    expect(allowedCorsOrigin('http://localhost:3000')).toBe('http://localhost:3000');
    expect(allowedCorsOrigin('http://localhost:5173')).toBe('http://localhost:5173');
  });

  it('allows any loopback origin outside production', () => {
    expect(allowedCorsOrigin('http://127.0.0.1:4173')).toBe('http://127.0.0.1:4173');
  });

  it('rejects unknown remote origins', () => {
    expect(allowedCorsOrigin('https://evil.example')).toBe('');
  });
});

describe('liveness probes', () => {
  const app = createApp();

  it('GET /ping', async () => {
    const res = await app.request('/ping');
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean; pong: boolean };
    expect(body.ok).toBe(true);
    expect(body.pong).toBe(true);
  });

  it('GET /health is live and does not 451', async () => {
    const res = await app.request('/health', { headers: { 'cf-ipcountry': 'US' } });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean; status: string };
    expect(body.ok).toBe(true);
    expect(body.status).toBe('live');
  });

  it('CORS preflight from local Vite origin', async () => {
    const res = await app.request('/v1/calendar', {
      method: 'OPTIONS',
      headers: {
        Origin: 'http://localhost:5173',
        'Access-Control-Request-Method': 'GET',
      },
    });
    expect(res.headers.get('access-control-allow-origin')).toBe('http://localhost:5173');
  });

  it('JSON validation uses the standard error envelope', async () => {
    const res = await app.request('/v1/quotes', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: { code: string; message: string } };
    expect(body.error.code).toBe('VALIDATION');
    expect(body.error.message).toMatch(/wallet/i);
  });
});
