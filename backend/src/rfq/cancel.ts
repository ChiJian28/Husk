import { getReadClient } from '../thetanuts/client.js';
import { HuskError } from '../errors.js';
import type { UnsignedCall } from '../types/policy.js';

function asAddr(s: string): `0x${string}` {
  return s.toLowerCase() as `0x${string}`;
}

function quotationActive(state: unknown): boolean {
  if (Array.isArray(state)) return Boolean(state[0]);
  if (state && typeof state === 'object' && 'isActive' in state) {
    return Boolean((state as { isActive: boolean }).isActive);
  }
  return false;
}

function quotationRequester(params: unknown): string | null {
  if (Array.isArray(params) && params[0]) return String(params[0]).toLowerCase();
  if (params && typeof params === 'object' && 'requester' in params) {
    return String((params as { requester: string }).requester).toLowerCase();
  }
  return null;
}

export async function encodeCancelQuotation(opts: {
  quotationId: string;
  wallet: string;
}): Promise<UnsignedCall> {
  const client = getReadClient();
  const id = BigInt(opts.quotationId);
  const q = await client.optionFactory.getQuotation(id);
  const requester = quotationRequester(q.params);
  if (requester && requester !== opts.wallet.toLowerCase()) {
    throw new HuskError('NOT_REQUESTER', 'Only the RFQ requester can cancel this quotation', 403);
  }
  if (!quotationActive(q.state)) {
    throw new HuskError('NOT_ACTIVE', 'Quotation is already inactive (settled or cancelled)', 409);
  }
  const { to, data } = client.optionFactory.encodeCancelQuotation(id);
  return {
    to: asAddr(to),
    data: data as `0x${string}`,
    value: '0',
    description: `cancelQuotation ${opts.quotationId} (reclaim USDC reserve)`,
  };
}
