import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { AsyncLocalStorage } from 'node:async_hooks';
import type { KeyStorageProvider } from '@thetanuts-finance/thetanuts-client';
import { env } from '../config.js';
import { logger } from '../logger.js';
import { getServiceClient } from '../db/supabase.js';

const walletAls = new AsyncLocalStorage<string>();

export function withWalletKeyContext<T>(wallet: string, fn: () => Promise<T>): Promise<T> {
  return walletAls.run(wallet.toLowerCase(), fn);
}

function masterKey(): Buffer {
  return Buffer.from(env.HUSK_ENCRYPTION_MASTER_KEY, 'hex');
}

export function encryptSecret(plainHex: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', masterKey(), iv);
  const ct = Buffer.concat([cipher.update(plainHex, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1:${iv.toString('hex')}:${tag.toString('hex')}:${ct.toString('hex')}`;
}

export function decryptSecret(blob: string): string {
  const [v, ivH, tagH, ctH] = blob.split(':');
  if (v !== 'v1' || !ivH || !tagH || !ctH) throw new Error('bad ciphertext');
  const decipher = createDecipheriv('aes-256-gcm', masterKey(), Buffer.from(ivH, 'hex'));
  decipher.setAuthTag(Buffer.from(tagH, 'hex'));
  return Buffer.concat([decipher.update(Buffer.from(ctH, 'hex')), decipher.final()]).toString('utf8');
}

function scopedId(keyId: string): string {
  const w = walletAls.getStore();
  return w ? `wallet:${w}:${keyId}` : `wallet:default:${keyId}`;
}

export class EncryptedKeyStore implements KeyStorageProvider {
  private mem = new Map<string, string>();

  private async loadRow(walletKey: string): Promise<string | null> {
    const { data, error } = await getServiceClient()
      .from('rfq_keypairs')
      .select('ciphertext')
      .eq('wallet', walletKey)
      .is('quotation_id', null)
      .order('created_at', { ascending: false })
      .limit(1);
    if (error || !data || data.length === 0) return null;
    const row = data[0] as { ciphertext: string };
    return decryptSecret(row.ciphertext);
  }

  async get(keyId: string): Promise<string | null> {
    const id = scopedId(keyId);
    const hit = this.mem.get(id);
    if (hit) return hit;
    const walletAddr = walletAls.getStore() ?? 'default';
    try {
      const plain = (await this.loadRow(walletAddr)) ?? (await this.loadRow(id));
      if (!plain) return null;
      this.mem.set(id, plain);
      return plain;
    } catch (e) {
      logger.warn({ err: e instanceof Error ? e.message : e }, 'rfq key get failed');
      return null;
    }
  }

  async set(keyId: string, privateKey: string): Promise<void> {
    const id = scopedId(keyId);
    this.mem.set(id, privateKey);
    const walletAddr = walletAls.getStore() ?? 'default';
    try {
      const ciphertext = encryptSecret(privateKey);
      const db = getServiceClient();
      const { data: existing } = await db
        .from('rfq_keypairs')
        .select('id')
        .eq('wallet', walletAddr)
        .is('quotation_id', null)
        .order('created_at', { ascending: false })
        .limit(1);
      const row = existing?.[0] as { id: string } | undefined;
      if (row?.id) {
        await db.from('rfq_keypairs').update({ ciphertext, public_key: id }).eq('id', row.id);
      } else {
        await db.from('rfq_keypairs').insert({
          wallet: walletAddr,
          quotation_id: null,
          public_key: id,
          ciphertext,
          created_at: new Date().toISOString(),
        });
      }
    } catch (e) {
      logger.warn({ err: e instanceof Error ? e.message : e }, 'rfq key persist failed (memory only)');
    }
  }

  async remove(keyId: string): Promise<void> {
    const id = scopedId(keyId);
    this.mem.delete(id);
  }

  async has(keyId: string): Promise<boolean> {
    return (await this.get(keyId)) != null;
  }
}

export async function bindQuotationId(wallet: string, quotationId: string, publicKey: string): Promise<void> {
  try {
    await getServiceClient()
      .from('rfq_keypairs')
      .update({ quotation_id: quotationId })
      .eq('wallet', wallet.toLowerCase())
      .is('quotation_id', null);
    logger.info({ wallet, quotationId, publicKey: publicKey.slice(0, 10) }, 'rfq key bound to quotation');
  } catch (e) {
    logger.warn({ err: e instanceof Error ? e.message : e }, 'bind quotation id failed');
  }
}
