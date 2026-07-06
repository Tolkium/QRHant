/** Crockford Base32: digits+letters without I, L, O, U (decoding maps i/l->1, o->0). */
export const CROCKFORD = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

export const CODE_LENGTH = 6;

/** Generate a random code, e.g. "K7F3QX". */
export function generateCode(): string {
  const bytes = new Uint8Array(CODE_LENGTH);
  crypto.getRandomValues(bytes);
  let out = '';
  for (let i = 0; i < CODE_LENGTH; i++) {
    out += CROCKFORD[bytes[i] % 32];
  }
  return out;
}

/**
 * Normalize scanned/typed input into canonical code form.
 * Returns null when the input cannot be a valid code.
 */
export function normalizeCode(raw: string): string | null {
  let s = raw.trim().toUpperCase().replace(/[\s-]/g, '');
  s = s.replace(/O/g, '0').replace(/[IL]/g, '1');
  if (s.length !== CODE_LENGTH) return null;
  for (const ch of s) {
    if (!CROCKFORD.includes(ch)) return null;
  }
  return s;
}

export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export function bytesToB64(bytes: Uint8Array): string {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

export function b64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
