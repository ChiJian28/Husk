import { env } from '../config.js';
import { HuskError } from '../errors.js';
import { logger } from '../logger.js';
import type { ExecutionPlan, PolicyQuote, Structure } from '../types/policy.js';

export type SafetyCtx = {
  notionalUsdc: bigint;
  structure: Structure;
  spender: string;
  approveAmount: bigint;
};

export function assertSafetyPolicy(ctx: SafetyCtx): void {
  if (ctx.notionalUsdc > env.AGENT_MAX_NOTIONAL_USDC) {
    throw new HuskError(
      'SAFETY_LIMITS_REQUIRED',
      `notional ${ctx.notionalUsdc} exceeds cap ${env.AGENT_MAX_NOTIONAL_USDC}`,
      403,
    );
  }
  if (ctx.structure !== 'PUT' && ctx.structure !== 'PUT_SPREAD') {
    throw new HuskError('SAFETY_LIMITS_REQUIRED', `structure ${ctx.structure} not allowed`, 403);
  }
  logger.info(
    {
      notionalUsdc: ctx.notionalUsdc.toString(),
      structure: ctx.structure,
      spender: ctx.spender,
      approveAmount: ctx.approveAmount.toString(),
    },
    'onWriteAction allow',
  );
}

export async function runAutonomous(quote: PolicyQuote, plan: ExecutionPlan): Promise<{ hashes: string[] }> {
  const { getSignerClient } = await import('../thetanuts/client.js');
  if (!env.privateKey) throw new HuskError('NO_SIGNER', 'THETANUTS_PRIVATE_KEY required', 400);
  const notional = BigInt(plan.approveAmountUsdc);
  assertSafetyPolicy({
    notionalUsdc: notional,
    structure: quote.structure,
    spender: plan.spender,
    approveAmount: notional,
  });
  const client = getSignerClient();
  const signer = client.requireSigner();
  const hashes: string[] = [];
  for (const call of plan.calls) {
    const tx = await signer.sendTransaction({ to: call.to, data: call.data, value: BigInt(call.value || '0') });
    const rec = await tx.wait();
    if (!rec) throw new HuskError('NO_RECEIPT', 'missing receipt');
    hashes.push(rec.hash);
    logger.info({ hash: rec.hash, description: call.description }, 'autonomous tx');
  }
  return { hashes };
}
