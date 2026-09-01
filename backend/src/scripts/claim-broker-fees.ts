import { env } from '../config.js';
import { getProvider, getReadClient, getSignerClient, hasSigner } from '../thetanuts/client.js';
import { Interface, type InterfaceAbi } from 'ethers';
import { fromUsdc } from '../thetanuts/decimals.js';
import { readAccumulatedFees } from '../broker/partnerFee.js';

if (!env.partnerBrokerAddress) {
  console.error('PARTNER_BROKER_ADDRESS empty');
  process.exit(1);
}
const usdc = getReadClient().chainConfig.tokens.USDC.address;
const acc = await readAccumulatedFees(getProvider(), env.partnerBrokerAddress, usdc);
console.log('accumulated USDC', fromUsdc(acc));
if (!process.argv.includes('--send')) {
  console.log('pass --send to claim');
  process.exit(0);
}
if (!hasSigner()) {
  console.error('no signer');
  process.exit(1);
}
const iface = new Interface(['function claimPartnerFees(address token)'] as InterfaceAbi);
const data = iface.encodeFunctionData('claimPartnerFees', [usdc]);
const tx = await getSignerClient().requireSigner().sendTransaction({ to: env.partnerBrokerAddress, data });
const rec = await tx.wait();
console.log('claimed', rec?.hash);
