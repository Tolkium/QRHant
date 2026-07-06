// Edge Function: admin-only bulk code generation in production pack format.
// One Argon2id run per code derives the match tag + AES-256-GCM key; the card
// content is encrypted with that key. Mirrors the client-side pack-crypto.ts.
//
// Deploy: supabase functions deploy generate-codes

import { createClient } from 'npm:@supabase/supabase-js@2';
import { argon2id } from 'npm:hash-wasm@4';

const CROCKFORD = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const CODE_LENGTH = 6;
const TAG_BYTES = 16;
const KEY_BYTES = 32;

function generateCode(): string {
  const bytes = new Uint8Array(CODE_LENGTH);
  crypto.getRandomValues(bytes);
  let out = '';
  for (let i = 0; i < CODE_LENGTH; i++) out += CROCKFORD[bytes[i] % 32];
  return out;
}

function b64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function bytesToB64(bytes: Uint8Array): string {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

Deno.serve(async (req) => {
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, content-type',
  };
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const jwt = (req.headers.get('Authorization') ?? '').replace('Bearer ', '');
  const { data: userData } = await admin.auth.getUser(jwt);
  if (!userData?.user) return json({ error: 'unauthorized' }, 401, cors);

  const { data: profile } = await admin
    .from('profiles')
    .select('role')
    .eq('id', userData.user.id)
    .single();
  if (profile?.role !== 'admin') return json({ error: 'forbidden' }, 403, cors);

  const { eventId, count, titlePrefix } = (await req.json()) as {
    eventId: string;
    count: number;
    titlePrefix: string;
  };

  const { data: event } = await admin
    .from('events')
    .select('id, argon_salt, argon_params, pack_version')
    .eq('id', eventId)
    .single();
  if (!event) return json({ error: 'event not found' }, 404, cors);

  const params = event.argon_params as {
    memory: number;
    iterations: number;
    parallelism: number;
  };

  const { data: existing } = await admin
    .from('codes')
    .select('code')
    .eq('event_id', eventId);
  const taken = new Set((existing ?? []).map((c) => c.code));
  const startIndex = taken.size;

  const rows = [];
  for (let i = 0; i < Math.min(count, 500); i++) {
    let plaintext = generateCode();
    while (taken.has(plaintext)) plaintext = generateCode();
    taken.add(plaintext);

    const raw = (await argon2id({
      password: plaintext,
      salt: b64ToBytes(event.argon_salt),
      parallelism: params.parallelism,
      iterations: params.iterations,
      memorySize: params.memory,
      hashLength: TAG_BYTES + KEY_BYTES,
      outputType: 'binary',
    })) as Uint8Array;

    const tag = bytesToHex(raw.slice(0, TAG_BYTES));
    const key = await crypto.subtle.importKey(
      'raw',
      raw.slice(TAG_BYTES),
      { name: 'AES-GCM' },
      false,
      ['encrypt'],
    );
    const title = `${titlePrefix} ${startIndex + i + 1}`;
    const content = { title, art: { en: '', sk: '', cs: '' } };
    const iv = new Uint8Array(12);
    crypto.getRandomValues(iv);
    const ct = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      new TextEncoder().encode(JSON.stringify(content)),
    );

    rows.push({
      event_id: eventId,
      code: plaintext,
      title,
      art: content.art,
      tag,
      iv: bytesToB64(iv),
      ciphertext: bytesToB64(new Uint8Array(ct)),
    });
  }

  const { error } = await admin.from('codes').insert(rows);
  if (error) return json({ error: error.message }, 500, cors);

  await admin
    .from('events')
    .update({ pack_version: event.pack_version + 1 })
    .eq('id', eventId);

  return json({ created: rows.length }, 200, cors);
});

function json(body: unknown, status: number, cors: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
}
