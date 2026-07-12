-- Theme presets: player preference + profile column grant
alter table public.profiles
  add column if not exists preferred_theme_id text;

revoke update on public.profiles from authenticated;
grant update (avatar, language, preferred_theme_id) on public.profiles to authenticated;
