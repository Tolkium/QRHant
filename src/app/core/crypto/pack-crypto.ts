import { argon2id } from 'hash-wasm';
import type { ArgonParams, CardContent, OfflinePack, PackEntry } from '../models';
import { b64ToBytes, bytesToB64, bytesToHex } from './codec';

/**
 * Core of the offline anti-cheat scheme.
 *
 * One Argon2id run per code produces 48 bytes:
 *   bytes 0..15  -> match tag (stored in the pack, identifies the code entry)
 *   bytes 16..47 -> AES-256-GCM key (never stored; re-derived on scan)
 *
 * The pack therefore contains nothing that reveals a plaintext code, and card
 * content can only be decrypted by whoever physically scanned the code.
 */

const TAG_BYTES = 16;
const KEY_BYTES = 32;

export interface DerivedCode {
  tag: string;
  key: CryptoKey;
}

export async function deriveCode(
  code: string,
  argonSaltB64: string,
  params: ArgonParams,
): Promise<DerivedCode> {
  const raw = await argon2id({
    password: code,
    salt: b64ToBytes(argonSaltB64),
    parallelism: params.parallelism,
    iterations: params.iterations,
    memorySize: params.memory,
    hashLength: TAG_BYTES + KEY_BYTES,
    outputType: 'binary',
  });
  const tag = bytesToHex(raw.slice(0, TAG_BYTES));
  const key = await crypto.subtle.importKey(
    'raw',
    raw.slice(TAG_BYTES).slice().buffer as ArrayBuffer,
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt'],
  );
  return { tag, key };
}

export async function encryptContent(
  content: CardContent,
  key: CryptoKey,
): Promise<{ iv: string; ciphertext: string }> {
  const iv = new Uint8Array(12);
  crypto.getRandomValues(iv);
  const data = new TextEncoder().encode(JSON.stringify(content));
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, data);
  return { iv: bytesToB64(iv), ciphertext: bytesToB64(new Uint8Array(ct)) };
}

export async function decryptContent(
  entry: Pick<PackEntry, 'iv' | 'ciphertext'>,
  key: CryptoKey,
): Promise<CardContent> {
  const pt = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: b64ToBytes(entry.iv).slice().buffer as ArrayBuffer },
    key,
    b64ToBytes(entry.ciphertext).slice().buffer as ArrayBuffer,
  );
  return JSON.parse(new TextDecoder().decode(pt)) as CardContent;
}

export interface PackMatch {
  entry: PackEntry;
  content: CardContent;
}

/**
 * Match a scanned code against the pack: one Argon2 run, O(1) tag lookup,
 * decrypt on hit. Returns null when the code is not part of the hunt.
 */
export async function matchAgainstPack(
  code: string,
  pack: OfflinePack,
): Promise<PackMatch | null> {
  const { tag, key } = await deriveCode(code, pack.argonSalt, pack.argonParams);
  const entry = pack.entries.find((e) => e.tag === tag);
  if (!entry) return null;
  try {
    const content = await decryptContent(entry, key);
    return { entry, content };
  } catch {
    // GCM auth failure: tag collision or tampered pack — treat as no match
    return null;
  }
}

export function newArgonSalt(): string {
  const salt = new Uint8Array(16);
  crypto.getRandomValues(salt);
  return bytesToB64(salt);
}
