import { describe, expect, it } from 'vitest';
import { Interface, ZeroAddress } from 'ethers';
import { OPTION_BOOK_ABI, OPTION_FACTORY_ABI } from '@thetanuts-finance/thetanuts-client';
import { decodeFillLogs } from '../../src/execution/verifyFill.js';

const wallet = '0x078c418ded28f40bb7f5c88170440fece54ced1a';
const broker = '0xb371a71c7bfc344b1aed3c3ba4c837f50d49a540';
const option = '0x00000000000000000000000000000000000000aa';
const factory = new Interface(OPTION_FACTORY_ABI);
const book = new Interface(OPTION_BOOK_ABI);

describe('decodeFillLogs', () => {
  it('parses QuotationRequested into rfq_open (not Coverage active)', () => {
    const encoded = factory.encodeEventLog('QuotationRequested', [42n, wallet, 1_000_000n, '0x02ab']);
    const r = decodeFillLogs({ from: wallet, status: 1, logs: [{ topics: encoded.topics, data: encoded.data }] }, wallet);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.kind).toBe('rfq_requested');
    expect(r.quotationId).toBe('42');
    expect(r.optionAddress).toBeUndefined();
  });

  it('parses QuotationSettled into rfq_settled with option address', () => {
    const encoded = factory.encodeEventLog('QuotationSettled', [42n, wallet, broker, option]);
    const r = decodeFillLogs({ from: wallet, status: 1, logs: [{ topics: encoded.topics, data: encoded.data }] }, wallet);
    expect(r.ok).toBe(true);
    if (!r.ok || r.kind !== 'rfq_settled') return;
    expect(r.quotationId).toBe('42');
    expect(r.optionAddress).toBe(option);
  });

  it('parses OrderFilled with partner broker as buyer', () => {
    const encoded = book.encodeEventLog('OrderFilled', [
      1n,
      broker,
      '0x0000000000000000000000000000000000000001',
      option,
      1_500_000n,
      0n,
      ZeroAddress,
      0n,
      true,
    ]);
    const r = decodeFillLogs(
      { from: wallet, status: 1, logs: [{ topics: encoded.topics, data: encoded.data }] },
      wallet,
      broker,
    );
    expect(r.ok).toBe(true);
    if (!r.ok || r.kind !== 'book_fill') return;
    expect(r.optionAddress).toBe(option);
    expect(r.buyer).toBe(broker);
  });

  it('parses QuotationCancelled into rfq_cancelled', () => {
    const encoded = factory.encodeEventLog('QuotationCancelled', [124n]);
    const r = decodeFillLogs({ from: wallet, status: 1, logs: [{ topics: encoded.topics, data: encoded.data }] }, wallet);
    expect(r.ok).toBe(true);
    if (!r.ok || r.kind !== 'rfq_cancelled') return;
    expect(r.quotationId).toBe('124');
  });

  it('rejects a receipt with neither book nor factory events', () => {
    const r = decodeFillLogs({ from: wallet, status: 1, logs: [] }, wallet);
    expect(r.ok).toBe(false);
  });
});
