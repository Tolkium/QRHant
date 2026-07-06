-- QR Hunt schema. Mirrors the shapes in src/app/core/models.ts.
-- Apply with: supabase db push (or the SQL editor).

-- ---------- profiles ----------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nickname text not null unique,
  avatar text not null default 'fox',
  language text not null default 'en' check (language in ('en', 'sk', 'cs')),
  role text not null default 'player' check (role in ('player', 'admin')),
  banned boolean not null default false,
  created_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin' and not banned
  );
$$;

alter table public.profiles enable row level security;

create policy "read own profile" on public.profiles
  for select using (id = auth.uid() or public.is_admin());

create policy "insert own profile" on public.profiles
  for insert with check (id = auth.uid());

-- players may change avatar/language only; role and banned are protected by
-- the column grant below
create policy "update own profile" on public.profiles
  for update using (id = auth.uid() or public.is_admin());

revoke update on public.profiles from authenticated;
grant update (avatar, language) on public.profiles to authenticated;

-- ---------- events ----------

create table public.events (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  state text not null default 'setup' check (state in ('setup', 'live', 'ended')),
  active boolean not null default false,
  theme jsonb not null,
  leaderboard_flags jsonb not null,
  hunt_settings jsonb not null,
  maps jsonb not null default '[]',
  pack_version integer not null default 1,
  argon_salt text not null,
  argon_params jsonb not null
);

alter table public.events enable row level security;

create policy "players read active event" on public.events
  for select using (active or public.is_admin());

create policy "admin writes events" on public.events
  for all using (public.is_admin()) with check (public.is_admin());

-- only one active event at a time
create unique index one_active_event on public.events (active) where active;

-- ---------- codes ----------
-- Plaintext codes NEVER reach players: no player select policy exists.
-- The offline pack is served by get_pack() which exposes safe columns only.

create table public.codes (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  code text not null,
  title text not null default '',
  art jsonb not null default '{"en":"","sk":"","cs":""}',
  image text, -- artwork photo (compressed data URL); also encrypted into ciphertext
  map_id text,
  map_x double precision,
  map_y double precision,
  map_note text,
  release_at timestamptz,
  created_at timestamptz not null default now(),
  tag text not null,
  iv text not null,
  ciphertext text not null,
  unique (event_id, code),
  unique (event_id, tag)
);

alter table public.codes enable row level security;

create policy "admin only codes" on public.codes
  for all using (public.is_admin()) with check (public.is_admin());

-- ---------- finds ----------
-- Insert happens exclusively in the sync-finds Edge Function (service role).

create table public.finds (
  user_id uuid not null references public.profiles (id) on delete cascade,
  code_id uuid not null references public.codes (id) on delete cascade,
  event_id uuid not null references public.events (id) on delete cascade,
  client_found_at timestamptz not null,
  clamped_found_at timestamptz not null,
  synced_at timestamptz not null default now(),
  primary key (user_id, code_id)
);

alter table public.finds enable row level security;

create policy "read own finds" on public.finds
  for select using (user_id = auth.uid() or public.is_admin());

-- ---------- anomalies / per-user server state ----------

create table public.anomalies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  event_id uuid not null references public.events (id) on delete cascade,
  kind text not null,
  detail text not null,
  created_at timestamptz not null default now()
);

alter table public.anomalies enable row level security;

create policy "admin only anomalies" on public.anomalies
  for all using (public.is_admin()) with check (public.is_admin());

create table public.user_state (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  last_contact timestamptz,
  invalid_strikes integer not null default 0,
  request_stamps timestamptz[] not null default '{}'
);

alter table public.user_state enable row level security;

create policy "admin only user_state" on public.user_state
  for all using (public.is_admin()) with check (public.is_admin());

-- ---------- offline pack RPC (safe columns only) ----------

create or replace function public.get_pack(p_event_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'eventId', e.id,
    'version', e.pack_version,
    'argonSalt', e.argon_salt,
    'argonParams', e.argon_params,
    'entries', coalesce(
      (
        select jsonb_agg(jsonb_build_object(
          'id', c.id,
          'title', c.title,
          'tag', c.tag,
          'iv', c.iv,
          'ciphertext', c.ciphertext,
          'releaseAt', c.release_at
        ))
        from public.codes c
        where c.event_id = e.id
      ),
      '[]'::jsonb
    )
  )
  from public.events e
  where e.id = p_event_id and (e.active or public.is_admin());
$$;

-- ---------- leaderboard RPC (flags applied server-side) ----------

create or replace function public.get_leaderboard(p_event_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_flags jsonb;
  v_rows jsonb;
  v_you jsonb;
  v_top_n integer;
begin
  select leaderboard_flags into v_flags from public.events where id = p_event_id;
  if v_flags is null then
    raise exception 'event not found';
  end if;
  v_top_n := coalesce((v_flags->>'topN')::integer, 0);

  with agg as (
    select
      f.user_id,
      p.nickname,
      p.avatar,
      count(*)::integer as cnt,
      max(f.clamped_found_at) as last_find
    from public.finds f
    join public.profiles p on p.id = f.user_id
    where f.event_id = p_event_id and p.role = 'player' and not p.banned
    group by f.user_id, p.nickname, p.avatar
  ),
  ranked as (
    select *,
      row_number() over (order by cnt desc, last_find asc)::integer as rank
    from agg
  )
  select
    jsonb_agg(to_row order by rank) filter (
      where v_top_n = 0 or rank <= v_top_n
    ),
    (jsonb_agg(to_row) filter (where user_id = auth.uid())) -> 0
  into v_rows, v_you
  from (
    select user_id, rank, jsonb_build_object(
      'userId', user_id,
      'nickname', nickname,
      'avatar', avatar,
      'count', cnt,
      'lastFindAt', last_find,
      'isYou', user_id = auth.uid(),
      'rank', rank
    ) as to_row
    from ranked
  ) r;

  return jsonb_build_object(
    'flags', v_flags,
    'entries', case
      when (v_flags->>'visible')::boolean then coalesce(v_rows, '[]'::jsonb)
      else '[]'::jsonb
    end,
    'you', v_you
  );
end;
$$;

-- ---------- realtime ----------
-- Enable realtime on finds so clients can refresh the leaderboard live.
alter publication supabase_realtime add table public.finds;
