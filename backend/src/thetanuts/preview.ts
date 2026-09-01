import type { OrderWithSignature } from '@thetanuts-finance/thetanuts-client';
import { getReadClient } from './client.js';
import { fromUsdc } from './decimals.js';

export function previewFill(order: OrderWithSignature, usdcAmount: bigint) {
  const client = getReadClient();
  return client.optionBook.previewFillOrder(order, usdcAmount);
}

export function previewToDryRun(order: OrderWithSignature, usdcAmount: bigint) {
  const p = previewFill(order, usdcAmount);
  return {
    numContracts: p.numContracts.toString(),
    maxContracts: p.maxContracts.toString(),
    totalCollateral: p.totalCollateral.toString(),
    totalCollateralUsdc: fromUsdc(p.totalCollateral),
    pricePerContract: p.pricePerContract.toString(),
    expiry: p.expiry.toString(),
    isCall: p.isCall,
    strikes: p.strikes.map((s) => s.toString()),
    maker: p.maker,
  };
}
