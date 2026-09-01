import type { Structure } from '../types/policy.js';

export function vanillaPutFallbackReason(opts: {
  spread: { kLo: number } | null;
  preference?: Structure;
}): string | undefined {
  if (opts.preference === 'PUT') return 'user requested unlimited downside (vanilla PUT)';
  if (!opts.spread || opts.spread.kLo <= 0) return 'spread width collapsed; falling back to vanilla PUT';
  return undefined;
}
