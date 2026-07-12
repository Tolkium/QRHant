import fs from 'fs';

const html = fs.readFileSync('design/index.html', 'utf8');
const m = html.match(/<style>([\s\S]*?)<\/style>/);
if (!m) process.exit(1);

const css = m[1];
const blocks = [];
const re = /([^{}]+)\{([^{}]*)\}/g;
let match;
while ((match = re.exec(css)) !== null) {
  blocks.push({ sel: match[1].trim(), body: match[2].trim() });
}

const skipSel =
  /card-eats|card-grid|card-stamp|card-sticker|card-scene|card-inner\.|scan-viewfinder|settings-|\.avatar[^-]|\.btn-accent|\.app:|nav-scan-tab|izakaya-pill|izakaya-plate|izakaya-tag|izakaya-pill|kawaii-badge|sumi-stamp|\.phone\b|\.card-img\.|\.card-detail|\.card-eats/;

const classMap = [
  ['.progress-block', '.hunt-progress'],
  ['.progress-row', '.hunt-progress-row'],
  ['.progress-title', '.hunt-progress-title'],
  ['.progress-bar', '.hunt-progress-bar'],
  ['.progress-fill', '.hunt-progress-fill'],
  ['.progress-label', '.hunt-progress-label'],
  ['.filters', '.hunt-filters'],
  ['.chip', '.hunt-chip'],
  ['.bottom-nav', '.hunt-nav'],
  ['.nav-tab', '.hunt-nav-tab'],
  ['.nav-scan-fab', '.hunt-scan-fab'],
  ['.nav-scan-slot', '.hunt-scan-slot'],
  ['.nav-icon-slot', '.hunt-nav-icon-slot'],
  ['.nav-icon', '.hunt-nav-icon'],
  ['.app-header', '.hunt-header'],
  ['.app-logo', '.hunt-logo'],
  ['.app-main', '.hunt-main'],
  ['.locked-card', '.hunt-card-locked'],
  ['.card-body', '.hunt-card-body'],
  ['.card-title', '.hunt-card-title'],
  ['.card-meta', '.hunt-card-meta'],
  ['.card-img.locked', '.hunt-card-art-locked'],
  ['.card-img', '.hunt-card-art'],
  ['.card-zen', '.hunt-card-zen'],
  ['.card-kiyo', '.hunt-card-kiyo'],
  ['.card-wamon', '.hunt-card-wamon'],
  ['.card-sumi', '.hunt-card-sumi'],
  ['.card-kawaii', '.hunt-card-kawaii'],
  ['.card-izakaya', '.hunt-card-izakaya'],
  ['.card-inner', '.hunt-card-inner'],
];

function mapClasses(sel) {
  let s = sel;
  for (const [from, to] of classMap) s = s.split(from).join(to);
  s = s.replace(
    /\[data-active-theme="([^"]+)"\] \.app\b/g,
    '[data-active-theme="$1"] body, [data-active-theme="$1"] .hunt-app',
  );
  s = s.replace(/\.card > \.hunt-card-art/g, '.hunt-card > .hunt-card-art-direct');
  s = s.replace(/\.card > \.hunt-card-body/g, '.hunt-card > .hunt-card-body-direct');
  s = s.replace(/\.card\.hunt-card-locked/g, '.hunt-card.hunt-card-locked');
  s = s.replace(/\.card > /g, '.hunt-card > ');
  if (s.includes('.card') && !s.includes('.hunt-card')) {
    s = s.replace(/\.card\b/g, '.hunt-app .hunt-card');
  }
  return s;
}

function mapVars(body) {
  const keys = [
    '--primary-ink', '--primary', '--accent', '--surface', '--muted', '--shadow',
    '--radius-lg', '--radius', '--font-display', '--font', '--line', '--good', '--bad', '--bg', '--ink',
  ];
  let b = body;
  for (const v of keys) b = b.split(`var(${v})`).join(`var(--c${v.slice(1)})`);
  return b;
}

function stripTokenProps(body) {
  return body
    .split(';')
    .map((l) => l.trim())
    .filter((l) => l && !/^--[a-z-]+:/.test(l) && l !== 'background: var(--c-bg)')
    .join('; ');
}

function stripNavMargin(body) {
  return body
    .split(';')
    .map((l) => l.trim())
    .filter((l) => l && !/^margin(?:-|$)/.test(l))
    .join('; ');
}

const themeBlocks = [];
const decoBlocks = [];

for (const { sel, body } of blocks) {
  const isDeco =
    /^\.(zen-deco|wamon-deco|sumi-deco|kawaii-deco|izakaya-deco|phone-ambient|glass-blob)/.test(sel) ||
    /^\.(zen-deco|wamon-deco|sumi-deco|kawaii-deco|izakaya-deco|phone-ambient|glass-blob)-/.test(sel) ||
    (sel.includes('phone-ambient') && !sel.includes('[data-active-theme'));

  if (isDeco && !skipSel.test(sel)) {
    let mappedSel = mapClasses(sel);
    let mappedBody = mapVars(body);
    decoBlocks.push(`${mappedSel} {\n  ${mappedBody};\n}`);
    continue;
  }

  if (!sel.includes('[data-active-theme=')) continue;
  if (skipSel.test(sel)) continue;

  let mappedSel = mapClasses(sel);
  let mappedBody = mapVars(body);

  if (/body,.*\.hunt-app|\.hunt-app/.test(mappedSel)) {
    mappedBody = stripTokenProps(mappedBody);
    if (!mappedBody) continue;
  }

  if (mappedSel.includes('.hunt-nav') && !mappedSel.includes('hunt-nav-tab')) {
    mappedBody = stripNavMargin(mappedBody);
    if (!mappedBody) continue;
  }

  if (mappedSel.includes('.hunt-progress-fill')) {
    mappedBody = mappedBody
      .split(';')
      .map((l) => l.trim())
      .filter((l) => l && !/^width:/.test(l))
      .join('; ');
    if (!mappedBody) continue;
  }

  themeBlocks.push(`${mappedSel} {\n  ${mappedBody};\n}`);
}

const base = `/* Theme cosmetics — ported from design/index.html. Tokens via ThemeStore (--c-*). */
/* IMPORTANT: No hunt UI colors in Angular component styles — theme rules live here only. */

.hunt-app {
  position: relative;
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  background: var(--c-bg);
  color: var(--c-ink);
  font-family: var(--c-font, system-ui, sans-serif);
}

.hunt-main {
  flex: 1;
  padding-bottom: 5.5rem;
  position: relative;
  z-index: 1;
}

.hunt-header {
  position: relative;
  z-index: 2;
  font-family: var(--c-font-display, inherit);
  background: var(--c-surface);
  border-bottom: 1px solid var(--c-line);
}

.hunt-logo {
  font-family: var(--c-font-display, inherit);
}

.hunt-nav-dock {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 10;
  padding: 0 0.55rem calc(0.55rem + env(safe-area-inset-bottom));
  pointer-events: none;
}

.hunt-nav {
  pointer-events: auto;
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: flex-end;
  background: var(--c-surface);
  border: 1px solid var(--c-line);
  border-radius: 1.15rem;
  padding: 0.35rem 0.5rem 0.45rem;
  box-shadow: var(--c-shadow);
}

.hunt-nav-tab {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.2rem;
  padding: 0.35rem 0.5rem;
  min-width: 56px;
  min-height: 44px;
  flex: 1;
  font-size: 0.6rem;
  font-weight: 700;
  color: var(--c-muted);
  text-decoration: none;
  font-family: inherit;
  text-align: center;
  line-height: 1.15;
}

.hunt-nav-tab .lbl {
  display: block;
}

.hunt-nav-tab.active {
  color: var(--c-primary);
}

.hunt-nav-icon-slot {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  flex-shrink: 0;
}

.hunt-nav-icon-slot svg,
.hunt-nav-icon {
  width: 22px;
  height: 22px;
  stroke: currentColor;
  fill: none;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.hunt-scan-slot {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1;
}

.hunt-scan-fab {
  width: 52px;
  height: 52px;
  flex-shrink: 0;
  border-radius: 50%;
  background: var(--c-primary);
  color: var(--c-primary-ink);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-top: -1rem;
  box-shadow: 0 4px 16px color-mix(in srgb, var(--c-primary) 40%, transparent);
  border: 3px solid var(--c-bg);
  transition: transform 0.12s;
}

.hunt-scan-fab svg,
.hunt-scan-fab .hunt-nav-icon {
  width: 24px;
  height: 24px;
}

.hunt-progress {
  position: relative;
  z-index: 2;
  padding: 0.75rem 1rem;
  background: color-mix(in srgb, var(--c-bg) 92%, transparent);
  border-bottom: 1px solid var(--c-line);
}

.hunt-progress-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.hunt-progress-title {
  font-family: var(--c-font-display, inherit);
  font-weight: 800;
  font-size: 0.95rem;
}

.hunt-layout-toggle {
  font-size: 0.7rem;
  color: var(--c-muted);
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.15rem 0.25rem;
  font-family: inherit;
}

.hunt-progress-bar {
  height: 8px;
  background: var(--c-line);
  border-radius: 999px;
  overflow: hidden;
}

.hunt-progress-fill {
  height: 100%;
  background: var(--c-primary);
  border-radius: 999px;
  transition: width 0.4s;
}

.hunt-filters {
  display: flex;
  gap: 0.35rem;
  margin-top: 0.6rem;
  flex-wrap: wrap;
}

.hunt-chip {
  padding: 0.3rem 0.75rem;
  border-radius: 999px;
  font-size: 0.72rem;
  font-weight: 700;
  border: 1px solid var(--c-line);
  background: var(--c-surface);
  color: var(--c-muted);
  cursor: pointer;
  font-family: inherit;
}

.hunt-chip.on {
  background: var(--c-primary);
  color: var(--c-primary-ink);
  border-color: var(--c-primary);
}

.hunt-card-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.6rem;
  padding: 0.75rem;
}

.hunt-card {
  position: relative;
  aspect-ratio: 3 / 4;
  min-height: 130px;
  overflow: hidden;
  display: block;
  text-decoration: none;
  color: inherit;
  background: var(--c-surface);
  border: 1px solid var(--c-line);
  border-radius: var(--c-radius-lg);
  box-shadow: var(--c-shadow);
}

.hunt-card-art {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.hunt-card-art img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.hunt-card-body {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 2;
  padding: 1.75rem var(--card-body-pad-right, 0.55rem) 0.5rem var(--card-body-pad-left, 0.55rem);
  background: linear-gradient(
    to top,
    rgba(0, 0, 0, 0.78) 0%,
    rgba(0, 0, 0, 0.42) 55%,
    transparent 100%
  );
  color: #fff;
}

.hunt-card-locked .hunt-card-body {
  background: linear-gradient(
    to top,
    rgba(0, 0, 0, 0.62) 0%,
    rgba(0, 0, 0, 0.28) 50%,
    transparent 100%
  );
}

.hunt-card-title {
  font-weight: 700;
  font-size: 0.78rem;
  line-height: 1.2;
}

.hunt-card-meta {
  font-size: 0.65rem;
  color: rgba(255, 255, 255, 0.82);
  margin-top: 0.15rem;
}

.hunt-card-locked {
  border-style: dashed;
  border-color: color-mix(in srgb, var(--c-line) 80%, var(--c-muted));
}

.hunt-card-art-locked {
  background: linear-gradient(
    160deg,
    color-mix(in srgb, var(--c-line) 70%, var(--c-muted)),
    var(--c-line)
  );
  color: var(--c-muted);
  display: flex;
  align-items: center;
  justify-content: center;
}

.hunt-card-lock-icon {
  width: 1.65rem;
  height: 1.65rem;
  opacity: 0.8;
  stroke: currentColor;
  flex-shrink: 0;
}

.hunt-card-lock-slot {
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 0;
}

.hunt-card-lock-slot .hunt-card-lock-icon {
  width: 1.65rem;
  height: 1.65rem;
}

.hunt-card-lock-list .hunt-card-lock-slot .hunt-card-lock-icon {
  width: 1.5rem;
  height: 1.5rem;
}

/* Theme card layers — one visible per active theme (see [data-active-theme] rules) */
.hunt-card-zen,
.hunt-card-kiyo,
.hunt-card-wamon,
.hunt-card-sumi,
.hunt-card-kawaii,
.hunt-card-izakaya {
  display: none;
  position: absolute;
  inset: 0;
  z-index: 1;
  overflow: hidden;
}

.hunt-card-inner {
  position: absolute;
  inset: 0;
  z-index: 1;
  overflow: hidden;
}

/* Found cards with uploaded artwork: photo layer wins over theme illustration. */
.hunt-card.hunt-card-has-photo > .hunt-card-zen,
.hunt-card.hunt-card-has-photo > .hunt-card-kiyo,
.hunt-card.hunt-card-has-photo > .hunt-card-wamon,
.hunt-card.hunt-card-has-photo > .hunt-card-sumi,
.hunt-card.hunt-card-has-photo > .hunt-card-kawaii,
.hunt-card.hunt-card-has-photo > .hunt-card-izakaya {
  display: none !important;
}

.hunt-card.hunt-card-has-photo > .hunt-card-inner {
  display: block !important;
  z-index: 2;
}

.hunt-card.hunt-card-has-locked-preview > .hunt-card-zen,
.hunt-card.hunt-card-has-locked-preview > .hunt-card-kiyo,
.hunt-card.hunt-card-has-locked-preview > .hunt-card-wamon,
.hunt-card.hunt-card-has-locked-preview > .hunt-card-sumi,
.hunt-card.hunt-card-has-locked-preview > .hunt-card-kawaii,
.hunt-card.hunt-card-has-locked-preview > .hunt-card-izakaya {
  display: none !important;
}

.hunt-card.hunt-card-has-locked-preview > .hunt-card-inner {
  display: block !important;
  z-index: 2;
}

.hunt-card-locked-preview-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  filter: grayscale(0.4) brightness(0.95);
}

.hunt-card-lock-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1;
}

.hunt-card-art-locked .hunt-card-lock-overlay .hunt-card-lock-icon {
  opacity: 0.95;
}

.hunt-card-zen .zen-art,
.hunt-card-kiyo .kiyo-art,
.hunt-card-wamon .wamon-art,
.hunt-card-sumi .sumi-art,
.hunt-card-kawaii .kawaii-art,
.hunt-card-izakaya .izakaya-art {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.hunt-card-zen .zen-art svg,
.hunt-card-kiyo .kiyo-art svg,
.hunt-card-wamon .wamon-art svg,
.hunt-card-sumi .sumi-art svg,
.hunt-card-kawaii .kawaii-art svg,
.hunt-card-izakaya .izakaya-art svg {
  width: 100%;
  height: 100%;
  display: block;
}

.hunt-card-zen .hunt-card-body,
.hunt-card-kiyo .hunt-card-body,
.hunt-card-wamon .hunt-card-body,
.hunt-card-sumi .hunt-card-body,
.hunt-card-kawaii .hunt-card-body,
.hunt-card-izakaya .hunt-card-body,
.hunt-card-inner .hunt-card-body {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 3;
  margin-top: 0;
  border-top: none;
}

/* Deco layers hidden until theme activates them */
.phone-ambient,
.glass-blob,
.zen-deco,
.wamon-deco,
.sumi-deco,
.kawaii-deco,
.izakaya-deco {
  display: none;
}

.hunt-deco-layer {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
  z-index: 0;
}

`;

const richCardThemes = [
  ['kiyo', 'hunt-card-kiyo'],
  ['wamon', 'hunt-card-wamon'],
  ['sumi', 'hunt-card-sumi'],
  ['kawaii', 'hunt-card-kawaii'],
  ['izakaya', 'hunt-card-izakaya'],
  ['zen', 'hunt-card-zen'],
];

const allCardLayers = [
  'hunt-card-zen',
  'hunt-card-kiyo',
  'hunt-card-wamon',
  'hunt-card-sumi',
  'hunt-card-kawaii',
  'hunt-card-izakaya',
  'hunt-card-inner',
];

const layerSwaps =
  richCardThemes
    .map(([themeId, activeLayer]) => {
      const hide = allCardLayers
        .filter((l) => l !== activeLayer)
        .map((l) => `[data-active-theme="${themeId}"] .${l}`)
        .join(',\n');
      return `/* ${themeId} card layer */
[data-active-theme="${themeId}"] .${activeLayer} { display: block; }
${hide} { display: none !important; }`;
    })
    .join('\n\n') +
  `

[data-active-theme="zen"] .hunt-card.hunt-card-locked {
  border-style: solid;
  box-shadow: var(--c-shadow);
}

[data-active-theme="zen"] .hunt-progress {
  border-bottom: none;
}
`;

const liquidGlassCss = `
@keyframes liquidMesh {
  0%, 100% { transform: translate(0, 0) scale(1); }
  33% { transform: translate(4%, -3%) scale(1.05); }
  66% { transform: translate(-3%, 2%) scale(0.97); }
}

@keyframes liquidShimmer {
  0%, 100% { opacity: 0.5; }
  50% { opacity: 0.9; }
}

[data-active-theme="liquid"] body,
[data-active-theme="liquid"] .hunt-app {
  background: #0a0a12;
}

[data-active-theme="liquid"] .phone-ambient {
  display: block;
  background: #0a0a12;
}

[data-active-theme="liquid"] .phone-ambient::before,
[data-active-theme="liquid"] .phone-ambient::after {
  content: "";
  position: absolute;
  border-radius: 50%;
  filter: blur(40px);
  animation: liquidMesh 8s ease-in-out infinite;
}

[data-active-theme="liquid"] .phone-ambient::before {
  width: 70%;
  height: 50%;
  top: 10%;
  left: 10%;
  background: radial-gradient(circle, #667eea, transparent 70%);
}

[data-active-theme="liquid"] .phone-ambient::after {
  width: 60%;
  height: 55%;
  bottom: 5%;
  right: 5%;
  background: radial-gradient(circle, #f093fb, transparent 70%);
  animation-delay: -4s;
}

[data-active-theme="liquid"] .glass-blob {
  display: block;
}

[data-active-theme="liquid"] .hunt-header,
[data-active-theme="liquid"] .hunt-progress,
[data-active-theme="liquid"] .hunt-app .hunt-card,
[data-active-theme="liquid"] .hunt-nav {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(24px) saturate(180%);
  -webkit-backdrop-filter: blur(24px) saturate(180%);
  border: 1px solid rgba(255, 255, 255, 0.22);
  box-shadow:
    0 8px 32px rgba(0, 0, 0, 0.15),
    inset 0 1px 0 rgba(255, 255, 255, 0.25);
}

[data-active-theme="liquid"] .hunt-card-art-locked {
  background: rgba(255, 255, 255, 0.05);
}
`;

const swatch = `
.theme-swatch {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.55rem 0.85rem;
  border-radius: 999px;
  border: 2px solid var(--c-line);
  background: var(--c-surface);
  color: var(--c-ink);
  font-weight: 700;
  font-size: 0.82rem;
  cursor: pointer;
}

.theme-swatch.active {
  border-color: var(--c-primary);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--c-primary) 35%, transparent);
}

.theme-swatch-dots {
  display: flex;
  gap: 3px;
}

.theme-swatch-dots span {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  border: 1px solid rgba(0, 0, 0, 0.08);
}
`;

fs.writeFileSync(
  'src/styles/themes.css',
  base +
    '\n' +
    decoBlocks.join('\n\n') +
    '\n\n' +
    themeBlocks.join('\n\n') +
    '\n\n' +
    layerSwaps +
    '\n\n' +
    liquidGlassCss +
    swatch,
);
console.log('theme rules:', themeBlocks.length, 'deco rules:', decoBlocks.length);
