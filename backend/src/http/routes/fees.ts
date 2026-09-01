import { Hono } from 'hono';
import { z } from 'zod';
import { jsonBody } from '../validate.js';
import { Interface, ZeroAddress, type InterfaceAbi } from 'ethers';
import { env } from '../../config.js';
import { getProvider, getReadClient, getSignerClient, hasSigner } from '../../thetanuts/client.js';
import { fromUsdc } from '../../thetanuts/decimals.js';
import { readAccumulatedFees, readBrokerFeeBps } from '../../broker/partnerFee.js';
import { fail, ok } from '../request.js';
import type { AppVars } from '../request.js';

const BROKER_WRITE = ['function claimPartnerFees(address token)'];

export const feeRoutes = new Hono<AppVars>()
  .get('/fees/broker', async (c) => {
    if (!env.partnerBrokerAddress) {
      return ok(c, { configured: false, feeBps: 0, accumulatedUsdc: '0' });
    }
    const usdc = getReadClient().chainConfig.tokens.USDC.address;
    const [bps, acc] = await Promise.all([
      readBrokerFeeBps(getProvider(), env.partnerBrokerAddress),
      readAccumulatedFees(getProvider(), env.partnerBrokerAddress, usdc),
    ]);
    return ok(c, {
      configured: true,
      broker: env.partnerBrokerAddress,
      feeBps: bps.toString(),
      accumulatedUsdc: fromUsdc(acc),
      intendedBps: env.PARTNER_BROKER_FEE_BPS,
    });
  })
  .post(
    '/fees/broker/claim',
    jsonBody(z.object({ send: z.boolean().optional() }).optional()),
    async (c) => {
      if (!env.partnerBrokerAddress) return fail(c, 'NO_BROKER', 'PARTNER_BROKER_ADDRESS empty');
      const usdc = getReadClient().chainConfig.tokens.USDC.address;
      const iface = new Interface(BROKER_WRITE as InterfaceAbi);
      const data = iface.encodeFunctionData('claimPartnerFees', [usdc]) as `0x${string}`;
      const call = { to: env.partnerBrokerAddress as `0x${string}`, data, value: '0' };
      const body = c.req.valid('json') ?? {};
      if (body.send && hasSigner()) {
        const tx = await getSignerClient().requireSigner().sendTransaction(call);
        const rec = await tx.wait();
        return ok(c, { sent: true, hash: rec?.hash, call });
      }
      return ok(c, { sent: false, call });
    },
  );

void ZeroAddress;
