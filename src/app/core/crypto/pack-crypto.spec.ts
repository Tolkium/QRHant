import { describe, expect, it } from 'vitest';
import { CODE_LENGTH, CROCKFORD, generateCode, normalizeCode } from './codec';
import {
  decryptContent,
  deriveCode,
  encryptContent,
  matchAgainstPack,
  newArgonSalt,
} from './pack-crypto';
import type { ArgonParams, CardContent, OfflinePack } from '../models';

// fast params for tests; production tuning lives in DEFAULT_ARGON
const TEST_ARGON: ArgonParams = { memory: 1024, iterations: 1, parallelism: 1 };

const CONTENT: CardContent = {
  title: 'Test Art',
  art: { en: 'english', sk: 'slovensky', cs: 'cesky' },
};

describe('codec', () => {
  it('generates codes of the right length and alphabet', () => {
    for (let i = 0; i < 200; i++) {
      const code = generateCode();
      expect(code).toHaveLength(CODE_LENGTH);
      for (const ch of code) expect(CROCKFORD).toContain(ch);
    }
  });

  it('normalizes ambiguous characters (Crockford)', () => {
    expect(normalizeCode('k7f3qx')).toBe('K7F3QX');
    expect(normalizeCode(' K7F3QX ')).toBe('K7F3QX');
    expect(normalizeCode('K7-F3QX')).toBe('K7F3QX');
    // O -> 0, I/L -> 1
    expect(normalizeCode('KOF3QX')).toBe('K0F3QX');
    expect(normalizeCode('KIF3QX')).toBe('K1F3QX');
    expect(normalizeCode('KLF3QX')).toBe('K1F3QX');
  });

  it('rejects garbage', () => {
    expect(normalizeCode('')).toBeNull();
    expect(normalizeCode('SHORT')).toBeNull();
    expect(normalizeCode('TOOLONG1')).toBeNull();
    expect(normalizeCode('K7F3Q!')).toBeNull();
    expect(normalizeCode('https://example.com')).toBeNull();
  });
});

describe('pack crypto', () => {
  it('derives a stable tag and a working AES key from a code', async () => {
    const salt = newArgonSalt();
    const a = await deriveCode('K7F3QX', salt, TEST_ARGON);
    const b = await deriveCode('K7F3QX', salt, TEST_ARGON);
    expect(a.tag).toBe(b.tag);

    const { iv, ciphertext } = await encryptContent(CONTENT, a.key);
    const decrypted = await decryptContent({ iv, ciphertext }, b.key);
    expect(decrypted).toEqual(CONTENT);
  });

  it('different codes produce different tags', async () => {
    const salt = newArgonSalt();
    const a = await deriveCode('K7F3QX', salt, TEST_ARGON);
    const b = await deriveCode('K7F3QY', salt, TEST_ARGON);
    expect(a.tag).not.toBe(b.tag);
  });

  it('matches a scanned code against the pack and decrypts the card', async () => {
    const salt = newArgonSalt();
    const code = generateCode();
    const { tag, key } = await deriveCode(code, salt, TEST_ARGON);
    const { iv, ciphertext } = await encryptContent(CONTENT, key);
    const pack: OfflinePack = {
      eventId: 'e1',
      version: 1,
      argonSalt: salt,
      argonParams: TEST_ARGON,
      entries: [{ id: 'c1', title: 'Test art', tag, iv, ciphertext, releaseAt: null }],
    };

    const hit = await matchAgainstPack(code, pack);
    expect(hit).not.toBeNull();
    expect(hit!.entry.id).toBe('c1');
    expect(hit!.content).toEqual(CONTENT);

    const miss = await matchAgainstPack('AAAAAA', pack);
    expect(miss).toBeNull();
  });

  it('wrong key cannot decrypt (GCM auth)', async () => {
    const salt = newArgonSalt();
    const right = await deriveCode('K7F3QX', salt, TEST_ARGON);
    const wrong = await deriveCode('XQ3F7K', salt, TEST_ARGON);
    const { iv, ciphertext } = await encryptContent(CONTENT, right.key);
    await expect(decryptContent({ iv, ciphertext }, wrong.key)).rejects.toThrow();
  });
});
