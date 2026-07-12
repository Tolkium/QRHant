-- Allow admins who participate in a hunt to appear on the leaderboard.

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
    where f.event_id = p_event_id and not p.banned
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
      'rank', rank,
      'isYou', user_id = auth.uid()
    ) as to_row
    from ranked
  ) sub;

  return jsonb_build_object(
    'flags', v_flags,
    'entries', coalesce(v_rows, '[]'::jsonb),
    'you', v_you
  );
end;
$$;
