# Supabase backend — Phase 3 setup

Flip the app from on-device mock to real Supabase. Do this **before** Cloudflare.

## 1. Create a Supabase project

1. [supabase.com/dashboard](https://supabase.com/dashboard) → **New project** (free tier is enough).
2. Note the **Project URL** and client key (Settings → API):
   - **Publishable** (`sb_publishable_…`) — use in `environment.local.ts` when legacy
     keys are disabled
   - or legacy **anon** (`eyJ…`) if still enabled
   Never use `service_role` / `sb_secret_…` in the Angular app.

## 2. Local credentials (never commit)

`src/environments/environment.local.ts` is gitignored. It already exists with placeholders — edit it:

```ts
export const environment = {
  backend: 'supabase',
  supabaseUrl: 'https://xxxx.supabase.co',
  supabaseAnonKey: 'eyJ...', // anon key only — never service_role
  // ...
};
```

Committed `environment.ts` stays on `backend: 'mock'` for CI and teammates.

Run the app against Supabase:

```bash
npm run start:supabase          # localhost
npm run start:supabase:lan      # phone on same Wi‑Fi (HTTPS still needed for camera)
```

## 3. Link CLI and push schema

```bash
npx supabase login
npx supabase link --project-ref <your-project-ref>   # ref = subdomain of the URL
npx supabase db push
```

This applies `0001_init.sql` + `0002_api_grants.sql` (tables, RLS, API grants,
`get_pack`, `get_leaderboard`, profile trigger).

## 4. Deploy Edge Functions

```bash
npx supabase functions deploy sync-finds
npx supabase functions deploy generate-codes
npx supabase functions deploy admin-reset-password
```

Or: `npm run supabase:functions`

## 5. Auth dashboard settings

Authentication → Providers → Email:

- **Disable “Confirm email”** — accounts use synthetic addresses
  `<nickname>@player.qrhunt.app`; nothing to confirm.

Optional: lengthen JWT/session if you want extra headroom beyond auto-refresh.

## 6. First admin account

1. **Clear site data** in the browser once (mock IndexedDB ≠ Supabase).
2. `npm run start:supabase` → register a normal account in the app.
3. Supabase dashboard → **SQL Editor**:

```sql
update public.profiles set role = 'admin' where nickname = 'your_nickname';
```

4. Log out and back in → `/admin` should work.

## 7. Demo test data (same as mock seed)

Loads **Demo Festival 2026** with 20 fixed QR codes, artwork, fake leaderboard
players (`demo123` password).

1. Copy `supabase/.env.example` → `supabase/.env`
2. Paste **service_role** key from Dashboard → Settings → API (never commit)
3. Run:

```bash
npm run seed:supabase
```

4. Hard-refresh the app (or clear site data) so the pack reloads.

## 8. Smoke test (repeat Phase 1 checklist)

| Area | What to verify |
| --- | --- |
| Auth | Register, login, refresh keeps session |
| Admin | Create event, bulk generate codes, upload artwork |
| Player | Pack loads, scan works, found card shows art (no code) |
| Sync | Phone scan → PC leaderboard updates |
| Offline | Airplane mode scan → back online → sync |
| Map | Place pins, print map |

Use a **“Dev Hunt”** test event; keep the real festival event for later.

## 9. Optional before go-live

- Authentication → MFA for admin TOTP (`enrollTotp` / `verifyTotp` in the client).
- Database → Backups (daily) before the event.

## Security recap

- Plaintext `codes.code` is admin-only (RLS). Players get the pack via `get_pack()`.
- `finds` inserts only through `sync-finds` (service role + re-validation).
- Leaderboard via `get_leaderboard()` — flags applied server-side.
- **Never** put `service_role` in the Angular app or git.

## npm scripts

| Script | Purpose |
| --- | --- |
| `npm run start:supabase` | Dev server with `environment.local.ts` |
| `npm run build:supabase` | Build with local Supabase env |
| `npm run supabase:push` | `supabase db push` |
| `npm run supabase:functions` | Deploy all three Edge Functions |
| `npm run seed:supabase` | Load demo event + codes + fake players |
