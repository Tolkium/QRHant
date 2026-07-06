# QR Hunt

Offline-capable QR treasure-hunt app for festivals. Players scan hidden QR
codes, unlock art cards, and climb a server-controlled leaderboard. Built as
an Angular PWA with a Capacitor Android shell; the alpha runs entirely
on-device with zero backend.

## Quick start

```bash
fnm use          # picks the Node version from .node-version
npm install
npm start        # http://localhost:4200
```

Demo data is seeded automatically on first launch:

- **Admin account**: nickname `admin`, password `admin123` → `/admin`
- **Demo event** with 20 art codes (5 scheduled for later release) and a fake
  leaderboard.
- To scan on desktop: open Admin → Codes, show a QR on screen, scan it with
  the webcam — or enable manual entry in Admin → Settings and type a code on
  the profile page.

To test on a phone, either run `npm run start:lan` (UI only — camera needs
HTTPS) or deploy `dist/qrhunt/browser` to any static host (Cloudflare Pages,
GitHub Pages).

## Architecture in one paragraph

All UI depends on five abstract APIs (`AuthApi`, `CodesApi`, `FindsApi`,
`LeaderboardApi`, `AdminApi` in `src/app/core/backend/api.ts`). The alpha
binds `MockBackend` — a full server simulation living in IndexedDB, including
timestamp clamping, rate limits and anomaly flags. Production binds
`SupabaseBackend` (same interfaces) by setting `environment.backend =
'supabase'`; schema, RLS and Edge Functions live in `supabase/` (see
`supabase/README.md`). The offline pack format is identical in both: per code
an Argon2id-derived match tag plus AES-256-GCM ciphertext of the card content,
keyed from the code itself — devices never hold plaintext codes.

## Key directories

| Path | What lives there |
| --- | --- |
| `src/app/core/crypto/` | Code generation, Argon2id derivation, pack encryption (unit-tested) |
| `src/app/core/backend/` | API boundary + mock and Supabase implementations |
| `src/app/core/stores/` | Signal stores: session, pack, finds, theme |
| `src/app/core/sync/` | Sync engine state machine (idle → syncing → backoff) |
| `src/app/features/hunt/` | Player UI: codes grid, card detail, scanner, ranking, profile |
| `src/app/features/admin/` | Admin panel: dashboard, events, codes, map editor, leaderboard flags, players, settings, print sheet |
| `supabase/` | Postgres schema + RLS, Edge Functions, deployment notes |
| `android/` | Capacitor Android project (MLKit native scanning) |

## Commands

```bash
npm start             # dev server
npm test              # vitest (crypto module has hard coverage)
npm run build         # production PWA -> dist/qrhunt/browser
npm run android:sync  # build web + sync into android/
npm run android:open  # open in Android Studio (requires Android Studio + JDK)
```

## Git workflow

- **`main`** — stable; production deploys from here (Phase 5).
- **`dev`** — daily work; open PRs into `main` when ready.
- CI runs on every push/PR to `main` or `dev`: `npm ci` → `ng test` → `ng build`.
- Keep `environment.ts` on `backend: 'mock'` with empty Supabase keys in git.
  For local Supabase testing (Phase 3), copy `environment.example.ts` to
  `environment.local.ts` (gitignored) — wire-up for that file comes in Phase 3.

## Android APK

`android/` is a complete Gradle project. Building the APK requires Android
Studio (or the SDK + JDK 21): run `npm run android:sync`, open the project,
and build. The scanner automatically switches from the web camera pipeline to
native MLKit inside the APK. Play Store submission needs a one-time $25
developer account; the PWA is fully usable without it.
