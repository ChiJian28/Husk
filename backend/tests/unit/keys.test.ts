import { describe, expect, it } from 'vitest';
import { encryptSecret, decryptSecret } from '../../src/rfq/keys.js';

describe('rfq key encrypt', () => {
  it('roundtrips AES-GCM', () => {
    const plain = '0x' + 'ab'.repeat(32);
    const blob = encryptSecret(plain);
    expect(blob.startsWith('v1:')).toBe(true);
    expect(decryptSecret(blob)).toBe(plain);
  });
});
