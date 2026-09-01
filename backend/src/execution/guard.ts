import { HuskError } from '../errors.js';
import { findOpenRfq } from '../coverage/repo.js';
import { listActiveCoverages } from '../coverage/service.js';
import type { PolicyQuote } from '../types/policy.js';

export function encodeBlockedReason(quote: PolicyQuote): 'ALREADY_COVERED' | 'OPEN_RFQ_EXISTS' | undefined {
  if (quote.intent.allowStack) return undefined;
  if (quote.warnings.includes('OPEN_RFQ_EXISTS')) return 'OPEN_RFQ_EXISTS';
  if (quote.warnings.includes('ALREADY_COVERED')) return 'ALREADY_COVERED';
  return undefined;
}

export async function assertCanEncode(quote: PolicyQuote): Promise<void> {
  if (quote.intent.allowStack) return;

  const open = await findOpenRfq(quote.intent.wallet, quote.event?.id, quote.expiryUnix);
  if (open) {
    throw new HuskError(
      'OPEN_RFQ_EXISTS',
      `open RFQ ${open.id} — use POST /v1/coverages/${open.id}/settle-plan, do not encode a second request`,
      409,
    );
  }

  const active = await listActiveCoverages(quote.intent.wallet, quote.intent.asset);
  const overlap = active.filter((c) => Number(c.expiry_unix) >= quote.expiryUnix);
  if (overlap.length) {
    throw new HuskError(
      'ALREADY_COVERED',
      `active coverage ${overlap[0]!.id} already spans this expiry; pass allowStack to add another`,
      409,
    );
  }

  const fromQuote = encodeBlockedReason(quote);
  if (fromQuote === 'OPEN_RFQ_EXISTS') {
    throw new HuskError(
      'OPEN_RFQ_EXISTS',
      `open RFQ ${quote.existingCoverageId ?? ''} — use POST /v1/coverages/${quote.existingCoverageId}/settle-plan, do not encode a second request`,
      409,
    );
  }
  if (fromQuote === 'ALREADY_COVERED') {
    throw new HuskError(
      'ALREADY_COVERED',
      `already covered through this expiry${quote.existingCoverageId ? ` (${quote.existingCoverageId})` : ''}; pass allowStack to add another`,
      409,
    );
  }
}
