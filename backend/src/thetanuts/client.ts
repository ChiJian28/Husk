import { JsonRpcProvider, Wallet } from 'ethers';
import {
  MemoryStorageProvider,
  ThetanutsClient,
  type KeyStorageProvider,
} from '@thetanuts-finance/thetanuts-client';
import { env } from '../config.js';
import { logger } from '../logger.js';
import { EncryptedKeyStore } from '../rfq/keys.js';

let readClient: ThetanutsClient | undefined;
let signerClient: ThetanutsClient | undefined;
let provider: JsonRpcProvider | undefined;
let keyStore: EncryptedKeyStore | undefined;

export function getProvider(): JsonRpcProvider {
  if (!provider) {
    provider = new JsonRpcProvider(env.THETANUTS_RPC_URL, env.CHAIN_ID, { staticNetwork: true });
  }
  return provider;
}

function clientOpts(signer?: Wallet, storage?: KeyStorageProvider) {
  return {
    chainId: 8453 as const,
    provider: getProvider(),
    signer,
    referrer: env.referrerAddress,
    apiBaseUrl: env.THETANUTS_API_BASE_URL,
    indexerApiUrl: env.THETANUTS_INDEXER_API_URL,
    pricingApiUrl: env.THETANUTS_PRICING_API_URL,
    stateApiUrl: env.THETANUTS_STATE_API_URL,
    wsUrl: env.THETANUTS_WS_URL,
    keyStorageProvider: storage,
    logger: {
      debug: (m: string, meta?: unknown) => logger.debug({ meta }, m),
      info: (m: string, meta?: unknown) => logger.info({ meta }, m),
      warn: (m: string, meta?: unknown) => logger.warn({ meta }, m),
      error: (m: string, meta?: unknown) => logger.error({ meta }, m),
    },
  };
}

export function getKeyStore(): EncryptedKeyStore {
  if (!keyStore) keyStore = new EncryptedKeyStore();
  return keyStore;
}

export function getReadClient(): ThetanutsClient {
  if (!readClient) {
    readClient = new ThetanutsClient(clientOpts(undefined, getKeyStore()));
  }
  return readClient;
}

export function getSignerClient(): ThetanutsClient {
  if (!env.privateKey) {
    throw new Error('THETANUTS_PRIVATE_KEY required for signer client');
  }
  if (!signerClient) {
    const wallet = new Wallet(env.privateKey, getProvider());
    signerClient = new ThetanutsClient(clientOpts(wallet, getKeyStore()));
  }
  return signerClient;
}

/** Utils-only client for unit tests — dummy RPC, never called. */
export function getUtilsClient(): ThetanutsClient {
  const dummy = new JsonRpcProvider('http://127.0.0.1:9', 8453, { staticNetwork: true });
  return new ThetanutsClient({
    chainId: 8453,
    provider: dummy,
    keyStorageProvider: new MemoryStorageProvider(),
  });
}

export function hasSigner(): boolean {
  return Boolean(env.privateKey);
}
