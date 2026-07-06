// Edge Function: admin-only password reset for players (auth.admin requires
// the service role, which must never reach the browser).
//
// Deploy: supabase functions deploy admin-reset-password

import { createClient } from 'npm:@supabase/supabase-js@2';

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
  if (!userData?.user) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: cors });
  }
  const { data: profile } = await admin
    .from('profiles')
    .select('role')
    .eq('id', userData.user.id)
    .single();
  if (profile?.role !== 'admin') {
    return new Response(JSON.stringify({ error: 'forbidden' }), { status: 403, headers: cors });
  }

  const { userId, newPassword } = (await req.json()) as { userId: string; newPassword: string };
  if (!userId || !newPassword || newPassword.length < 6) {
    return new Response(JSON.stringify({ error: 'invalid input' }), { status: 400, headers: cors });
  }

  const { error } = await admin.auth.admin.updateUserById(userId, { password: newPassword });
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: cors });
  }
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
});
