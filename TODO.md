# QR Hunt — backlog & optimization

Tracked improvements beyond day-to-day fixes. Prioritize by impact and risk.

## Optimization

| ID | Item | Why | Status |
|----|------|-----|--------|
| OPT-01 | **Refactor `theme-card-art.ts`** — split per-theme scene builders, shared SVG helpers, optional asset files instead of inline strings | ~500 lines of duplicated SVG strings; hard to review design tweaks; Deno copy depends on port script | **Open** |
| OPT-02 | **Admin panel i18n** — move remaining hardcoded English (dashboard, events, map, settings) into `public/i18n/*` | Card crop done; rest of admin is English-only | Open |
| OPT-03 | **Replace `alert()` for admin errors** with in-app toast or inline message component | Consistent UX with hunt profile flows | Open |
| OPT-04 | **Canvas integration tests** for `cropFramedImage` (rotation + export size) in Vitest with mocked `createImageBitmap` | Pure math covered in `image-dimensions.spec.ts`; full JPEG pipeline untested | Open |
| OPT-05 | **PWA / pack size budget** — monitor uploaded card JPEG weight after crop (target &lt; 80 KB per code at 360×480) | Large hunts store images in IndexedDB | Open |

## Admin UI

| ID | Item | Why | Status |
|----|------|-----|--------|
| ADM-01 | **Events page — list all events** — show every hunt in a clear list/grid, not only the currently selected draft | Hard to see what exists; sidebar dropdown alone is not enough | Open |
| ADM-02 | **Events page — create flow** — redesign “new event” so it feels normal and easy (not a bare inline form) | Current create UX is easy to miss and looks unfinished | Open |
| ADM-03 | **Events page — lock ended hunts** — ended events are read-only until admin explicitly unlocks for editing | Prevents accidental edits to finished hunts | Open |
| ADM-04 | **Events page — overall polish** — layout, status badges (live / setup / ended), active hunt emphasis, clearer actions | Events page needs a proper admin screen, not a single-card editor | Open |

## Done (this pass)

- Shared `ImageCropPreview` component (DRY crop display)
- `image-dimensions.ts` — canonical **360×480** (3∶4) for uploads, theme art, hunt grid, print
- Admin card crop strings in EN/SK/CS
- `coverMinScale` / `clampCropOffset` unit tests
- `@deno-sync-start` marker for safer `port-theme-card-art.mjs`

## Architecture notes (do not regress)

- Theme cosmetics: tokens + `themes.css` only — no per-theme branches in Angular components
- Card aspect ratio: **3∶4** (360×480) everywhere
- All card artwork: **360×480** (`CARD_ART`)

## Commands

```bash
node scripts/port-theme-card-art.mjs   # after editing theme-card-art.ts
npm test                               # vitest
npm run build
```
