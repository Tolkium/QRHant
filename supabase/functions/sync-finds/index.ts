// Edge Function: batched, idempotent find sync with server-side re-validation,
// timestamp clamping, admin-editable rate limits and anomaly flagging.
// Mirrors MockServer.submitFinds — keep the two in step.
//
// Deploy: supabase functions deploy sync-finds

import { createClient } from 'npm:@supabase/supabase-js@2';

interface FindSubmission {
  codeId: string;
  code: string;
  clientFoundAt: string;
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

  // identify the caller from their JWT
  const authHeader = req.headers.get('Authorization') ?? '';
  const jwt = authHeader.replace('Bearer ', '');
  const { data: userData, error: userError } = await admin.auth.getUser(jwt);
  if (userError || !userData.user) {
    return json({ error: 'unauthorized' }, 401, cors);
  }
  const userId = userData.user.id;

  const { eventId, finds } = (await req.json()) as {
    eventId: string;
    finds: FindSubmission[];
  };

  const { data: profile } = await admin
    .from('profiles')
    .select('banned')
    .eq('id', userId)
    .single();
  if (!profile || profile.banned) return json({ error: 'forbidden' }, 403, cors);

  const { data: event } = await admin
    .from('events')
    .select('id, starts_at, pack_version, hunt_settings')
    .eq('id', eventId)
    .single();
  if (!event) return json({ error: 'event not found' }, 404, cors);

  const settings = event.hunt_settings as {
    invalidCodeStrikes: number;
    syncRequestsPerMinute: number;
  };

  const nowIso = new Date().toISOString();
  const now = Date.parse(nowIso);

  // ----- per-user server state: rate limit + contact window -----
  const { data: stateRow } = await admin
    .from('user_state')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  const stamps = ((stateRow?.request_stamps as string[]) ?? [])
    .filter((t) => now - Date.parse(t) < 60_000)
    .concat(nowIso);

  if (stamps.length > settings.syncRequestsPerMinute) {
    await admin.from('anomalies').insert({
      user_id: userId,
      event_id: eventId,
      kind: 'burst-sync',
      detail: `Request rate above ${settings.syncRequestsPerMinute}/min`,
    });
    return json({ error: 'rate-limited' }, 429, cors);
  }

  const lastContact = stateRow?.last_contact as string | null;
  const windowStart = lastContact ? Date.parse(lastContact) : Date.parse(event.starts_at);

  // ----- re-validate every submitted code against plaintext -----
  const { data: codes } = await admin
    .from('codes')
    .select('id, code')
    .eq('event_id', eventId)
    .in('id', finds.map((f) => f.codeId));
  const byId = new Map((codes ?? []).map((c) => [c.id, c.code]));

  let accepted = 0;
  let duplicates = 0;
  let rejected = 0;
  let invalid = 0;
  let prevTime = 0;
  let orderViolation = false;
  let clustered = 0;

  for (const f of finds) {
    if (byId.get(f.codeId) !== f.code) {
      invalid++;
      rejected++;
      continue;
    }
    const clientTime = Date.parse(f.clientFoundAt);
    const clamped = Math.min(Math.max(clientTime || windowStart, windowStart), now);
    if (clamped - windowStart < 60_000) clustered++;
    if (prevTime && clamped < prevTime) orderViolation = true;
    prevTime = clamped;

    // idempotent: unique (user_id, code_id); conflict = duplicate = success
    const { error } = await admin.from('finds').insert({
      user_id: userId,
      code_id: f.codeId,
      event_id: eventId,
      client_found_at: f.clientFoundAt,
      clamped_found_at: new Date(clamped).toISOString(),
      synced_at: nowIso,
    });
    if (error) {
      if (error.code === '23505') duplicates++;
      else rejected++;
    } else {
      accepted++;
    }
  }

  // ----- anomaly flags -----
  const strikes = (stateRow?.invalid_strikes ?? 0) + invalid;
  if (invalid > 0 && strikes >= settings.invalidCodeStrikes) {
    await admin.from('anomalies').insert({
      user_id: userId,
      event_id: eventId,
      kind: 'invalid-codes',
      detail: `${strikes} invalid code submissions — possible API scripting`,
    });
  }
  if (orderViolation) {
    await admin.from('anomalies').insert({
      user_id: userId,
      event_id: eventId,
      kind: 'clock-jump',
      detail: 'Finds in batch not in chronological order',
    });
  }
  if (clustered >= 5) {
    await admin.from('anomalies').insert({
      user_id: userId,
      event_id: eventId,
      kind: 'window-cluster',
      detail: `${clustered} finds clustered at start of offline window`,
    });
  }

  await admin.from('user_state').upsert({
    user_id: userId,
    last_contact: nowIso,
    invalid_strikes: strikes,
    request_stamps: stamps,
  });

  return json(
    {
      accepted,
      duplicates,
      rejected,
      serverTime: nowIso,
      packVersion: event.pack_version,
    },
    200,
    cors,
  );
});

function json(body: unknown, status: number, cors: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
}
