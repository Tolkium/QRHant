# Supabase backend — deployment notes

The app runs fully on-device (mock backend) until you flip
`environment.backend` to `'supabase'`. Everything needed for the real backend
lives in this folder.

## One-time setup

1. Create a project at [supabase.com](https://supabase.com) (free tier is enough
   for 500 players / 3 days).
2. Install the CLI and link the project:

   ```bash
   npx supabase login
   npx supabase link --project-ref <your-project-ref>
   ```

3. Apply the schema:

   ```bash
   npx supabase db push
   ```

4. Deploy the Edge Functions:

   ```bash
   npx supabase functions deploy sync-finds
   npx supabase functions deploy generate-codes
   npx supabase functions deploy admin-reset-password
   ```

5. In `src/environments/environment.ts` set:

   ```ts
   backend: 'supabase',
   supabaseUrl: 'https://<ref>.supabase.co',
   supabaseAnonKey: '<anon key>',
   ```

6. Auth settings (dashboard → Authentication):
   - Disable "Confirm email" (accounts use synthetic e-mails
     `<nickname>@player.qrhunt.app`; there is nothing to confirm).
   - Set JWT expiry / session length so refresh comfortably outlasts the
     festival (default is fine; players stay logged in via auto-refresh).

7. Create the first admin: register a normal account in the app, then in the
   SQL editor run:

   ```sql
   update public.profiles set role = 'admin' where nickname = '<you>';
   ```

8. Admin TOTP 2FA: enable MFA in the dashboard (Authentication → MFA). The
   client exposes `enrollTotp()` / `verifyTotp()` on `SupabaseBackendService`;
   login throws `mfa-required` when a challenge is pending.

9. Turn on daily backups (dashboard → Database → Backups) before the event.

## Security model recap

- `codes.code` (plaintext) is admin-only via RLS; players get the pack through
  `get_pack()`, which exposes only `tag`/`iv`/`ciphertext`/`releaseAt`.
- `finds` has no insert policy — writes happen exclusively inside the
  `sync-finds` Edge Function (service role), which re-validates every code,
  clamps timestamps to [last contact, arrival], applies the admin-editable
  rate limits and records anomaly flags.
- The leaderboard is served by `get_leaderboard()`, which applies the
  visibility flags server-side, so hidden data never reaches the client.
