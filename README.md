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
| `design/` | UI theme lab (`index.html`) — share `/design/` with designers |
| `android/` | Capacitor Android project (MLKit native scanning) |

## Commands

```bash
npm start             # dev server
npm test              # vitest (crypto module has hard coverage)
npm run build         # production PWA -> dist/qrhunt/browser (needs env.deploy — use build:pages)
npm run build:pages   # Cloudflare Pages: writes env from SUPABASE_* vars, then builds
npm run android:sync  # build web + sync into android/
npm run android:open  # open in Android Studio (requires Android Studio + JDK)
```

## Git workflow

- **`main`** — stable; production deploys from here (Phase 5).
- **`dev`** — daily work; open PRs into `main` when ready.
- CI runs on every push/PR to `main` or `dev`: `npm ci` → `ng test` → `ng build`.
- Keep `environment.ts` on `backend: 'mock'` with empty Supabase keys in git.
  For Supabase testing (Phase 3), edit `src/environments/environment.local.ts`
  (gitignored) and run `npm run start:supabase`. See `supabase/README.md`.

## Android APK

`android/` is a complete Gradle project. Building the APK requires Android
Studio (or the SDK + JDK 21): run `npm run android:sync`, open the project,
and build. The scanner automatically switches from the web camera pipeline to
native MLKit inside the APK. Play Store submission needs a one-time $25
developer account; the PWA is fully usable without it.

## Cloudflare Pages

Host the PWA with Supabase. **Production** (`main`) uses **QRHant-Backend**;
**preview** deploys (e.g. `dev`) use **QRHant-Dev**. Keys live in Cloudflare,
not in git.

### 1. Create the Pages project

1. [Cloudflare Dashboard](https://dash.cloudflare.com) → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**
2. Repo: `Tolkium/QRHant`
3. **Production branch:** `main`
4. **Build settings:**

| Setting | Value |
| --- | --- |
| Framework preset | None |
| Build command | `npm run build:pages` |
| Build output directory | `dist/qrhunt/browser` |
| Root directory | `/` |

5. **Environment variables** → add for **Production** (QRHant-Backend):

| Name | Value |
| --- | --- |
| `NODE_VERSION` | `24.15.0` |
| `SUPABASE_URL` | `https://wsafofmssdycacqjzclv.supabase.co` |
| `SUPABASE_PUBLISHABLE_KEY` | publishable key from prod dashboard (Settings → API) |
| `BACKEND` | `supabase` |

6. Same variables for **Preview**, but **dev** URL + publishable key:

| Name | Preview value |
| --- | --- |
| `SUPABASE_URL` | `https://rvtltgrlsmapwonmwsbf.supabase.co` |
| `SUPABASE_PUBLISHABLE_KEY` | dev publishable key |

7. Save and deploy. SPA routing uses `public/_redirects`.

### 2. After first deploy

- Prod: register admin, create/seed event (or run `npm run seed:supabase` with `supabase/.env.prod` locally — careful).
- Dev preview URL: same flow against dev DB (already seeded).
- Camera/scan on phone needs **HTTPS** — Pages provides that automatically.

### Design lab (theme picker for designers)

The standalone UI lab in `design/index.html` is copied into every build at **`/design/`** (no app button — just share the URL).

| Where | Link |
| --- | --- |
| Local dev | `http://localhost:4200/design/` |
| Cloudflare Pages preview (`dev` branch) | `https://<your-preview>.pages.dev/design/` |
| Production | `https://<your-prod-domain>/design/` |

After pushing to `dev`, open the Pages preview deployment and append `/design/`. Designers can pick themes and layouts in the browser; choices are for reference only until integrated into the app.

### 3. Local smoke test of the Pages build

```bash
# PowerShell — use your dev or prod publishable key
$env:SUPABASE_URL="https://rvtltgrlsmapwonmwsbf.supabase.co"
$env:SUPABASE_PUBLISHABLE_KEY="sb_publishable_..."
npm run build:pages
npx serve dist/qrhunt/browser
```

Refs (no secrets): `supabase/projects.env.example`.
