-- API role access. Required when Supabase project has
-- "Automatically expose new tables" disabled (recommended).

grant usage on schema public to anon, authenticated;

grant select on public.events to anon, authenticated;

grant select, insert, update on public.profiles to authenticated;

grant select, insert, update, delete on public.events to authenticated;
grant select, insert, update, delete on public.codes to authenticated;
grant select, insert, update, delete on public.finds to authenticated;
grant select, insert, update, delete on public.anomalies to authenticated;
grant select, insert, update, delete on public.user_state to authenticated;

-- Auto-create profile when auth user is created (nickname in signUp metadata).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, nickname, language)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nickname', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'language', 'en')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
