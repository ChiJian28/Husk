import { zValidator } from '@hono/zod-validator';
import type { ZodType } from 'zod';
import { fail } from './request.js';

/** JSON body validator that always returns the standard `{ error: { code, message } }` envelope. */
export function jsonBody<T extends ZodType>(schema: T) {
  return zValidator('json', schema, (result, c) => {
    if (!result.success) {
      const msg = result.error.issues
        .map((i) => {
          const path = i.path.map(String).join('.');
          return path ? `${path}: ${i.message}` : i.message;
        })
        .join('; ');
      return fail(c as Parameters<typeof fail>[0], 'VALIDATION', msg || 'invalid json', 400);
    }
  });
}
