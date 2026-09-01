import { env } from '../config.js';
import { logger } from '../logger.js';
import { getReadClient, getSignerClient, hasSigner } from '../thetanuts/client.js';
import { fromUsdc, toUsdc } from '../thetanuts/decimals.js';
import { withWalletKeyContext } from './keys.js';
import { offerWithinReserve } from './reserve.js';
import { getQuoteRow, updateCoverage } from '../coverage/repo.js';
import type { RfqBuildSnapshot, UnsignedCall } from '../types/policy.js';

export type WatchRfqResult = {
  offers: number;
  settled?: boolean;
  settleCall?: UnsignedCall;
  offeror?: string;
  offerAmountUsdc?: string;
  rejectedAboveReserve?: { offeror: string; offerAmountUsdc: string }[];
  error?: string;
};

function asAddr(s: string): `0x${string}` {
  return s.toLowerCase() as `0x${string}`;
}

async function resolveReserve(row: {
  reserveUsdc?: string | null;
  quote_id?: string | null;
}): Promise<bigint | null> {
  if (row.reserveUsdc && Number(row.reserveUsdc) > 0) return toUsdc(row.reserveUsdc);
  if (!row.quote_id) return null;
  const q = await getQuoteRow(row.quote_id);
  if (!q) return null;
  if (Number(q.quote.totalDebitUsdc) > 0) return toUsdc(q.quote.totalDebitUsdc);
  const snap = q.quote.rfqRequest as RfqBuildSnapshot | undefined;
  if (snap && snap.reservePrice > 0 && snap.numContracts > 0) {
    return toUsdc((snap.reservePrice * snap.numContracts).toFixed(6));
  }
  return null;
}

export async function watchOpenRfq(row: {
  id: string;
  wallet: string;
  quotation_id: string | null;
  reserveUsdc?: string | null;
  quote_id?: string | null;
}): Promise<WatchRfqResult> {
  if (!row.quotation_id) return { offers: 0, error: 'no quotation_id on coverage row' };
  const reserveAmount = await resolveReserve(row);
  if (reserveAmount == null || reserveAmount <= 0n) {
    return { offers: 0, error: 'no RFQ reserve on coverage/quote; refusing to encode settle' };
  }

  const client = getReadClient();
  const quotationId = BigInt(row.quotation_id);
  let offerors: string[] = [];
  try {
    const rfqs = await client.api.getUserRfqs(row.wallet);
    const match = rfqs.find((r) => r.id === row.quotation_id || r.id === quotationId.toString());
    if (match?.offers) offerors = Object.keys(match.offers);
  } catch (e) {
    logger.warn({ err: e instanceof Error ? e.message : e }, 'getUserRfqs failed');
  }
  if (offerors.length === 0) {
    try {
      const currentBlock = await client.provider.getBlockNumber();
      const evs = await client.events.getOfferMadeEvents({
        fromBlock: Math.max(0, currentBlock - 50),
      });
      offerors = evs.filter((o) => o.quotationId === quotationId).map((o) => o.offeror);
    } catch (e) {
      logger.warn({ err: e instanceof Error ? e.message : e }, 'getOfferMadeEvents failed');
    }
  }
  if (offerors.length === 0) return { offers: 0 };

  const rejectedAboveReserve: { offeror: string; offerAmountUsdc: string }[] = [];

  for (const offeror of offerors) {
    try {
      const stateOffer = await client.api.getOffer(row.quotation_id, offeror);
      const decrypted = await withWalletKeyContext(row.wallet, () =>
        client.rfqKeys.decryptOffer(stateOffer.signedOfferForRequester, stateOffer.signingKey),
      );
      const offerAmountUsdc = fromUsdc(decrypted.offerAmount);
      if (!offerWithinReserve(decrypted.offerAmount, reserveAmount)) {
        rejectedAboveReserve.push({ offeror, offerAmountUsdc });
        logger.info(
          { quotationId: row.quotation_id, offeror, offerAmountUsdc, reserve: fromUsdc(reserveAmount) },
          'RFQ offer above reserve — skipped',
        );
        continue;
      }

      const { to, data } = client.optionFactory.encodeSettleQuotationEarly(
        quotationId,
        decrypted.offerAmount,
        decrypted.nonce,
        offeror,
      );
      const settleCall: UnsignedCall = {
        to: asAddr(to),
        data: data as `0x${string}`,
        value: '0',
        description: `settleQuotationEarly quotation ${row.quotation_id} vs ${offeror} @ ${offerAmountUsdc} USDC`,
      };

      if (env.encodeOnly || !hasSigner() || !env.huskJobsSend) {
        await updateCoverage(row.id, { status: 'awaiting_signature' });
        return {
          offers: offerors.length,
          settled: false,
          settleCall,
          offeror,
          offerAmountUsdc,
          rejectedAboveReserve,
        };
      }
      const signer = getSignerClient().requireSigner();
      const tx = await signer.sendTransaction({ to, data });
      const rec = await tx.wait();
      await updateCoverage(row.id, {
        status: 'active',
        settle_tx: rec?.hash,
        verified: true,
      });
      return {
        offers: offerors.length,
        settled: true,
        settleCall,
        offeror,
        offerAmountUsdc,
        rejectedAboveReserve,
      };
    } catch (e) {
      logger.warn({ err: e instanceof Error ? e.message : e, offeror }, 'RFQ offer decrypt/encode skipped');
    }
  }

  return {
    offers: offerors.length,
    rejectedAboveReserve,
    error:
      rejectedAboveReserve.length === offerors.length
        ? 'OFFER_ABOVE_RESERVE: every decrypted offer exceeds the RFQ reserve'
        : 'no acceptable offer could be decrypted',
  };
}
