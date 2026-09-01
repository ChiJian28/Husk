import { Contract } from 'ethers';
import { getProvider, getReadClient } from '../thetanuts/client.js';
import { fromUsdc, utils } from '../thetanuts/decimals.js';

const ERC20 = ['function balanceOf(address) view returns (uint256)'];

export type Holdings = {
  ethWei: bigint;
  wethWei: bigint;
  cbbtc: bigint;
  usdc: bigint;
  ethHuman: string;
  wethHuman: string;
  cbbtcHuman: string;
  usdcHuman: string;
  ethBagHuman: string;
};

export async function getHoldings(wallet: string): Promise<Holdings> {
  const client = getReadClient();
  const provider = getProvider();
  const tokens = client.chainConfig.tokens;
  const [ethWei, wethWei, cbbtc, usdc] = await Promise.all([
    provider.getBalance(wallet),
    new Contract(tokens.WETH.address, ERC20, provider).balanceOf(wallet) as Promise<bigint>,
    new Contract(tokens.cbBTC.address, ERC20, provider).balanceOf(wallet) as Promise<bigint>,
    new Contract(tokens.USDC.address, ERC20, provider).balanceOf(wallet) as Promise<bigint>,
  ]);
  const u = utils();
  const ethHuman = u.fromBigInt(ethWei, 18);
  const wethHuman = u.fromBigInt(wethWei, 18);
  const ethBag = ethWei + wethWei;
  return {
    ethWei,
    wethWei,
    cbbtc,
    usdc,
    ethHuman,
    wethHuman,
    cbbtcHuman: u.fromBigInt(cbbtc, 8),
    usdcHuman: fromUsdc(usdc),
    ethBagHuman: u.fromBigInt(ethBag, 18),
  };
}
