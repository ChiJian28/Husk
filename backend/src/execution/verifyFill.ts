import { Interface, type InterfaceAbi } from 'ethers';
import { OPTION_BOOK_ABI, OPTION_FACTORY_ABI } from '@thetanuts-finance/thetanuts-client';
import { env } from '../config.js';
import { getProvider } from '../thetanuts/client.js';
import { fromUsdc } from '../thetanuts/decimals.js';
import { insertFillVerification } from '../coverage/repo.js';

export type FillVerifyOk =
  | {
      ok: true;
      kind: 'book_fill';
      route: 'OPTIONBOOK';
      optionAddress: string;
      buyer: string;
      premiumUsdc: string;
      quotationId?: undefined;
    }
  | {
      ok: true;
      kind: 'rfq_requested';
      route: 'RFQ';
      quotationId: string;
      buyer: string;
      premiumUsdc: string;
      optionAddress?: undefined;
    }
  | {
      ok: true;
      kind: 'rfq_settled';
      route: 'RFQ';
      quotationId: string;
      optionAddress: string;
      buyer: string;
      premiumUsdc: string;
    };

export type FillVerifyResult = FillVerifyOk | { ok: false; reason: string };

export type ReceiptLike = {
  from: string;
  status: number | bigint | null;
  logs: ReadonlyArray<{ address?: string; topics: readonly string[]; data: string }>;
};

function addr(s: unknown): string {
  return String(s).toLowerCase();
}

/** Pure log decoder — no RPC. Used by verifyFillOnChain and unit tests. */
export function decodeFillLogs(receipt: ReceiptLike, wallet: string, broker?: string): FillVerifyResult {
  if (receipt.status !== 1 && receipt.status !== 1n) {
    return { ok: false, reason: 'transaction reverted' };
  }
  const taker = wallet.toLowerCase();
  if (receipt.from.toLowerCase() !== taker) {
    return { ok: false, reason: 'tx sender does not match claimed wallet' };
  }

  const bookIface = new Interface(OPTION_BOOK_ABI as InterfaceAbi);
  const factoryIface = new Interface(OPTION_FACTORY_ABI as InterfaceAbi);
  const brokerLc = broker?.toLowerCase();

  let requested: Extract<FillVerifyOk, { kind: 'rfq_requested' }> | undefined;
  let settled: Extract<FillVerifyOk, { kind: 'rfq_settled' }> | undefined;

  for (const log of receipt.logs) {
    try {
      const parsed = bookIface.parseLog({ topics: [...log.topics], data: log.data });
      if (parsed?.name === 'OrderFilled') {
        const buyer = addr(parsed.args.buyer ?? parsed.args[1]);
        const optionAddress = addr(parsed.args.optionAddress ?? parsed.args[3]);
        if (buyer !== taker && !(brokerLc && buyer === brokerLc)) {
          return { ok: false, reason: 'buyer in OrderFilled is neither taker nor partner broker' };
        }
        const premium = (parsed.args.premiumAmount ?? parsed.args[4]) as bigint;
        return {
          ok: true,
          kind: 'book_fill',
          route: 'OPTIONBOOK',
          optionAddress,
          buyer,
          premiumUsdc: fromUsdc(premium),
        };
      }
    } catch {
      /* not book */
    }
    try {
      const parsed = factoryIface.parseLog({ topics: [...log.topics], data: log.data });
      if (!parsed) continue;
      if (parsed.name === 'QuotationSettled') {
        const requester = addr(parsed.args.requester ?? parsed.args[1]);
        if (requester !== taker) {
          return { ok: false, reason: 'QuotationSettled requester does not match wallet' };
        }
        settled = {
          ok: true,
          kind: 'rfq_settled',
          route: 'RFQ',
          quotationId: (parsed.args.quotationId ?? parsed.args[0]).toString(),
          optionAddress: addr(parsed.args.optionAddress ?? parsed.args[3]),
          buyer: taker,
          premiumUsdc: '0',
        };
      } else if (parsed.name === 'QuotationRequested') {
        const requester = addr(parsed.args.requester ?? parsed.args[1]);
        if (requester !== taker) {
          return { ok: false, reason: 'QuotationRequested requester does not match wallet' };
        }
        const reserve = (parsed.args.reservePrice ?? parsed.args[2] ?? 0n) as bigint;
        requested = {
          ok: true,
          kind: 'rfq_requested',
          route: 'RFQ',
          quotationId: (parsed.args.quotationId ?? parsed.args[0]).toString(),
          buyer: taker,
          premiumUsdc: fromUsdc(reserve),
        };
      }
    } catch {
      /* not factory */
    }
  }

  if (settled) return settled;
  if (requested) return requested;
  return { ok: false, reason: 'no OrderFilled / QuotationRequested / QuotationSettled log' };
}

export async function verifyFillOnChain(opts: {
  txHash: string;
  wallet: string;
  expectedOption?: string;
}): Promise<FillVerifyResult> {
  const receipt = await getProvider().getTransactionReceipt(opts.txHash);
  if (!receipt) return { ok: false, reason: 'transaction not found on chain' };
  const decoded = decodeFillLogs(receipt, opts.wallet, env.partnerBrokerAddress);
  if (decoded.ok && decoded.kind !== 'rfq_requested' && opts.expectedOption) {
    if (decoded.optionAddress !== opts.expectedOption.toLowerCase()) {
      return { ok: false, reason: 'option address mismatch' };
    }
  }
  await insertFillVerification({
    tx_hash: opts.txHash.toLowerCase(),
    wallet: opts.wallet.toLowerCase(),
    option_address: decoded.ok ? (decoded.optionAddress ?? null) : null,
    buyer_in_event: decoded.ok ? decoded.buyer : null,
    ok: decoded.ok,
    reason: decoded.ok ? decoded.kind : decoded.reason,
    raw: decoded,
    created_at: new Date().toISOString(),
  });
  return decoded;
}
