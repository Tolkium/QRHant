import { BUILTIN_THEME_MAP, BuiltinThemeId, DEFAULT_BUILTIN_THEME_ID } from './theme-registry';
import { CARD_ART } from '../../shared/image-dimensions';

/** Portrait card art (360×480) aligned with design/index.html — SVG data URLs. */

export const THEME_UNLOCKED_ART_COUNT = 5;

export const THEME_LOCKED_PREVIEW_COUNT = 3;

const W = CARD_ART.width;
const H = CARD_ART.height;

type ThemeTokens = (typeof BUILTIN_THEME_MAP)[BuiltinThemeId]['tokens'];

function isBuiltin(id: string): id is BuiltinThemeId {
  return id in BUILTIN_THEME_MAP;
}

export function normalizeCosmeticsId(id: string | null | undefined): BuiltinThemeId {
  if (id && isBuiltin(id)) return id;

  return DEFAULT_BUILTIN_THEME_ID;
}

/** Resolve cosmetics theme from event.theme JSON (edge functions + admin). */

export function cosmeticsIdFromEventTheme(theme: unknown): BuiltinThemeId {
  if (!theme || typeof theme !== 'object') return DEFAULT_BUILTIN_THEME_ID;

  const raw = theme as { defaultPresetId?: string };

  return normalizeCosmeticsId(raw.defaultPresetId);
}

// @deno-sync-start — functions below are copied by scripts/port-theme-card-art.mjs

function svgDataUrl(svg: string): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function coverTransform(srcW: number, srcH: number): string {
  const scale = Math.max(W / srcW, H / srcH);

  const tx = (W - srcW * scale) / 2;

  const ty = (H - srcH * scale) / 2;

  return `translate(${tx.toFixed(2)},${ty.toFixed(2)}) scale(${scale.toFixed(4)})`;
}

function embed(srcW: number, srcH: number, inner: string): string {
  return `<g transform="${coverTransform(srcW, srcH)}">${inner}</g>`;
}

function portraitSvg(defs: string, bg: string, body: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">

${defs}<rect width="${W}" height="${H}" fill="${bg}"/>${body}</svg>`;
}

function gradBg(id: string, c0: string, c1: string, locked: boolean): string {
  return `<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1">

<stop offset="0%" stop-color="${c0}"/>

<stop offset="100%" stop-color="${c1}" stop-opacity="${locked ? '0.65' : '1'}"/>

</linearGradient></defs>`;
}

/* ── Rich themes: scenes ported from design/index.html + hunt-card.ts ── */

function zenScene(v: number, locked: boolean): string {
  const fill = locked ? '#f0ebe3' : '#faf6ef';

  const r = v % 4;

  const scenes: Record<number, string> = {
    0: locked
      ? `<rect fill="${fill}" width="120" height="120"/><path d="M60 90 L42 90 L45 65 L38 65 L60 40 L82 65 L75 65 L78 90Z" fill="#bbb" opacity="0.5"/><circle cx="40" cy="30" r="7" fill="#ddd"/>`
      : `<rect fill="${fill}" width="120" height="120"/><path d="M60 95 L38 95 L42 68 L32 68 L60 35 L88 68 L78 68 L82 95Z" fill="#1a1a1a" opacity="0.75"/><rect x="52" y="58" width="16" height="37" fill="#1a1a1a" opacity="0.5"/><circle cx="35" cy="28" r="9" fill="#c41e3a"/><circle cx="55" cy="18" r="7" fill="#c41e3a" opacity="0.85"/><circle cx="88" cy="32" r="8" fill="#c41e3a" opacity="0.9"/><circle cx="72" cy="15" r="6" fill="#c41e3a" opacity="0.7"/>`,

    1: locked
      ? `<rect fill="${fill}" width="120" height="120"/><circle cx="75" cy="40" r="28" fill="#ddd" opacity="0.5"/><path d="M30 95 L30 55 L42 48 L45 62 L55 52 L58 90Z" fill="#999" opacity="0.4"/><ellipse cx="38" cy="50" rx="8" ry="9" fill="#bbb" opacity="0.5"/>`
      : `<rect fill="${fill}" width="120" height="120"/><path d="M60 15 Q85 45 70 75 Q55 95 60 110" stroke="#5d4037" stroke-width="3" stroke-linecap="round" fill="none"/><rect x="48" y="40" width="6" height="22" rx="1" fill="#fff" stroke="#1a1a1a" stroke-width="0.7" transform="rotate(-6 51 51)"/><rect x="62" y="52" width="6" height="26" rx="1" fill="#fff" stroke="#1a1a1a" stroke-width="0.7" transform="rotate(4 65 65)"/><rect x="52" y="68" width="6" height="20" rx="1" fill="#fff" stroke="#1a1a1a" stroke-width="0.7"/><circle cx="90" cy="30" r="8" fill="#c41e3a"/><circle cx="100" cy="48" r="6" fill="#c41e3a" opacity="0.8"/>`,

    2: locked
      ? `<rect fill="${fill}" width="120" height="120"/><path d="M70 95 L100 55 L130 95" fill="none" stroke="#aaa" stroke-width="1.5"/><ellipse cx="100" cy="100" rx="60" ry="8" fill="#ccc" opacity="0.2"/>`
      : `<rect fill="${fill}" width="120" height="120"/><circle cx="75" cy="45" r="30" fill="#c41e3a" opacity="0.35"/><path d="M35 95 L35 60 L48 52 L52 68 L62 58 L65 95Z" fill="#1a1a1a" opacity="0.6"/><ellipse cx="44" cy="54" rx="9" ry="10" fill="#1a1a1a" opacity="0.45"/>`,

    3: locked
      ? `<rect fill="${fill}" width="120" height="120"/><circle cx="75" cy="40" r="28" fill="#ddd" opacity="0.5"/><path d="M30 95 L30 55 L42 48 L45 62 L55 52 L58 90Z" fill="#999" opacity="0.4"/>`
      : `<rect fill="${fill}" width="120" height="120"/><path d="M60 95 L38 95 L42 68 L32 68 L60 35 L88 68 L78 68 L82 95Z" fill="#1a1a1a" opacity="0.75"/><rect x="52" y="58" width="16" height="37" fill="#1a1a1a" opacity="0.5"/><circle cx="35" cy="28" r="9" fill="#c41e3a"/>`,
  };

  return portraitSvg('', fill, embed(120, 120, scenes[r] ?? scenes[0]));
}

function kiyoScene(v: number, locked: boolean, uid: string): string {
  if (locked) {
    const inner = `<rect width="200" height="120" fill="#e8e8ed"/><path d="M80 95 L100 55 L120 95Z" fill="#d2d2d7" opacity="0.6"/>`;

    return portraitSvg('', '#e8e8ed', embed(200, 120, inner));
  }

  const skies = [
    ['#b8d4f0', '#f0e8f4'],

    ['#ffd4a8', '#c5dff8'],

    ['#a8c8e8', '#f8e8f0'],

    ['#c5dff8', '#ffd4a8'],

    ['#b8d4f0', '#e8f0f8'],
  ];

  const [sky0, sky1] = skies[v % skies.length];

  const defs = `<defs>

<linearGradient id="ks${uid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="${sky0}"/><stop offset="100%" stop-color="${sky1}"/></linearGradient>

<linearGradient id="kf${uid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#5a6a7a"/><stop offset="100%" stop-color="#2c3e50"/></linearGradient>

</defs>`;

  const offset = (v % 3) * 8;

  const inner = `<rect width="200" height="120" fill="url(#ks${uid})"/>

<ellipse cx="${170 - offset}" cy="28" rx="22" ry="22" fill="#fff" opacity="0.9"/>

<path d="M${50 + offset} 98 L95 40 L${140 - offset} 98 Z" fill="url(#kf${uid})"/>

<path d="M90 55 L95 40 L100 55" fill="#fff" opacity="0.85"/>

<rect x="0" y="98" width="200" height="22" fill="#6b9b6b" opacity="0.35"/>

<path d="M10 75 Q40 60 70 75" stroke="#e8a0b8" stroke-width="2" fill="none"/>

<circle cx="25" cy="68" r="4" fill="#f5b0c0"/><circle cx="38" cy="72" r="3" fill="#f8c0d0"/>`;

  return portraitSvg(defs, sky0, embed(200, 120, inner));
}

function wamonScene(v: number, locked: boolean, uid: string): string {
  const bg = locked ? '#ebe4da' : '#f5efe6';

  if (locked) {
    return portraitSvg(
      '',
      bg,
      embed(
        200,
        120,
        `<rect fill="${bg}" width="200" height="120"/><circle cx="100" cy="60" r="28" fill="#b5352d" opacity="0.08"/>`,
      ),
    );
  }

  const patterns = [
    `d="M0 7 Q3.5 0 7 7 Q10.5 0 14 7"`,

    `d="M0 0 L4 8 L0 16 M8 0 L4 8 L8 16"`,

    `d="M0 4 L8 4 L4 0 L4 8"`,
  ];

  const pat = patterns[v % patterns.length];

  const patH = v % 2 === 0 ? 7 : 16;

  const patW = v % 2 === 0 ? 14 : 8;

  const defs = `<defs><pattern id="wm${uid}" width="${patW}" height="${patH}" patternUnits="userSpaceOnUse"><path ${pat} fill="none" stroke="#b8956a" stroke-width="0.8"/></pattern></defs>`;

  const wave =
    v % 2 === 0
      ? `<path d="M0 38 Q50 24 100 38 Q150 24 200 38 L200 48 Q150 58 100 48 Q50 58 0 48Z" fill="#b8956a" opacity="0.25"/>`
      : '';

  const inner = `<rect fill="${bg}" width="200" height="120"/><rect fill="url(#wm${uid})" width="200" height="120" opacity="0.55"/><circle cx="100" cy="55" r="32" fill="#b5352d" opacity="0.12"/>${wave}`;

  return portraitSvg(defs, bg, embed(200, 120, inner));
}

function sumiScene(v: number, locked: boolean): string {
  if (locked) {
    const inner = `<path d="M70 95 L100 55 L130 95" fill="none" stroke="#aaa" stroke-width="1.5"/><ellipse cx="100" cy="100" rx="60" ry="8" fill="#ccc" opacity="0.2"/>`;

    return portraitSvg('', '#fafafa', embed(200, 120, inner));
  }

  const scenes = [
    `<circle cx="42" cy="32" r="18" fill="#e60012"/><path d="M55 100 L100 35 L145 100" fill="none" stroke="#1a1a1a" stroke-width="2"/><path d="M88 95 L100 58 L112 95" fill="#fff"/>`,

    `<path d="M185 10 Q160 50 145 90 Q135 115 125 120" stroke="#1a1a1a" stroke-width="5" stroke-linecap="round"/><circle cx="152" cy="42" r="5" fill="#e60012"/><circle cx="165" cy="55" r="4.5" fill="#e60012"/><circle cx="142" cy="58" r="4" fill="#e60012"/><circle cx="155" cy="70" r="5" fill="#e60012"/>`,

    `<circle cx="55" cy="40" r="22" fill="#e60012" opacity="0.85"/><path d="M60 100 L100 42 L140 100" fill="none" stroke="#1a1a1a" stroke-width="2.5"/>`,

    `<path d="M30 100 L100 30 L170 100" fill="none" stroke="#1a1a1a" stroke-width="2"/><circle cx="48" cy="48" r="14" fill="#e60012"/>`,

    `<path d="M185 10 Q160 50 145 90" stroke="#1a1a1a" stroke-width="4" stroke-linecap="round"/><circle cx="42" cy="32" r="18" fill="#e60012"/>`,
  ];

  return portraitSvg('', '#ffffff', embed(200, 120, scenes[v % scenes.length]));
}

function kawaiiScene(v: number, locked: boolean): string {
  const bg = locked ? '#f5f0f1' : '#fff8f9';

  if (locked) {
    return portraitSvg(
      '',
      bg,
      embed(
        200,
        120,
        `<rect fill="${bg}" width="200" height="120"/><ellipse cx="100" cy="72" rx="40" ry="30" fill="#e8e0e2" stroke="#c9b8bc" stroke-width="1.2"/>`,
      ),
    );
  }

  const scenes = [
    `<rect fill="${bg}" width="200" height="120"/><ellipse cx="100" cy="78" rx="48" ry="36" fill="#fff" stroke="#4a3728" stroke-width="1.5"/><path d="M68 48 L78 28 L93 50" fill="#fff" stroke="#4a3728" stroke-width="1.5"/><path d="M132 48 L122 28 L107 50" fill="#fff" stroke="#4a3728" stroke-width="1.5"/><ellipse cx="82" cy="72" rx="9" ry="11" fill="#ffe566"/><ellipse cx="118" cy="72" rx="9" ry="11" fill="#ffe566"/><path d="M62 92 Q100 102 138 92" stroke="#e57373" stroke-width="4" fill="none" stroke-linecap="round"/>`,

    `<rect fill="${bg}" width="200" height="120"/><circle cx="155" cy="35" r="22" fill="#ffe566" opacity="0.85"/><path d="M30 85 Q60 60 100 75 Q140 90 170 70" stroke="#f4a0b0" stroke-width="3" fill="none" stroke-linecap="round"/>`,

    `<rect fill="${bg}" width="200" height="120"/><ellipse cx="100" cy="70" rx="55" ry="40" fill="#fff" stroke="#e8919d" stroke-width="2"/><circle cx="80" cy="62" r="6" fill="#4a3728"/><circle cx="120" cy="62" r="6" fill="#4a3728"/><path d="M85 88 Q100 98 115 88" stroke="#e57373" stroke-width="3" fill="none"/>`,

    `<rect fill="${bg}" width="200" height="120"/><circle cx="155" cy="35" r="22" fill="#ffe566" opacity="0.85"/><path d="M30 85 Q60 60 100 75 Q140 90 170 70" stroke="#f4a0b0" stroke-width="3" fill="none"/><circle cx="50" cy="50" r="8" fill="#f4a0b0" opacity="0.5"/><circle cx="170" cy="45" r="6" fill="#f4a0b0" opacity="0.4"/>`,

    `<rect fill="${bg}" width="200" height="120"/><ellipse cx="100" cy="78" rx="48" ry="36" fill="#fff" stroke="#4a3728" stroke-width="1.5"/><circle cx="100" cy="96" r="7" fill="#ffd54f" stroke="#f5a623" stroke-width="1.2"/>`,
  ];

  return portraitSvg('', bg, embed(200, 120, scenes[v % scenes.length]));
}

function izakayaScene(v: number, locked: boolean): string {
  const bg = '#2D3277';

  if (locked) {
    const inner = `<ellipse cx="30" cy="38" rx="22" ry="9" fill="#ccc"/>`;

    return portraitSvg('', bg, `<g transform="translate(150,260) scale(4)">${inner}</g>`);
  }

  const scenes = [
    `<ellipse cx="30" cy="32" rx="22" ry="14" fill="#f5f0e6"/><ellipse cx="30" cy="28" rx="16" ry="9" fill="#ff8a65"/><ellipse cx="30" cy="26" rx="12" ry="6" fill="#ffab91"/>`,

    `<ellipse cx="30" cy="38" rx="24" ry="10" fill="#2d3277"/><path d="M12 36 Q20 28 30 36 Q40 28 48 36" stroke="#f5f0e6" stroke-width="2" fill="none"/><circle cx="30" cy="30" r="8" fill="#fff"/><circle cx="30" cy="30" r="4" fill="#ffd54f"/>`,

    `<ellipse cx="30" cy="34" rx="20" ry="12" fill="#f5f0e6"/><ellipse cx="30" cy="30" rx="14" ry="8" fill="#E9542E"/><ellipse cx="30" cy="28" rx="8" ry="4" fill="#ffab91"/>`,

    `<ellipse cx="30" cy="32" rx="22" ry="14" fill="#f5f0e6"/><ellipse cx="30" cy="28" rx="16" ry="9" fill="#ff8a65"/>`,

    `<ellipse cx="30" cy="38" rx="24" ry="10" fill="#3a4090"/><path d="M14 34 Q22 26 30 34 Q38 26 46 34" stroke="#ffd54f" stroke-width="1.5" fill="none"/><circle cx="30" cy="30" r="7" fill="#fff"/>`,
  ];

  return portraitSvg(
    '',
    bg,
    `<g transform="translate(150,260) scale(4)">${scenes[v % scenes.length]}</g>`,
  );
}

/* ── Generic themes: portrait-native compositions from design cues ── */

function genericScene(
  themeId: BuiltinThemeId,

  variant: number,

  locked: boolean,

  tokens: ThemeTokens,
): string {
  const v = variant % 5;

  const { primary, accent, bg, surface, line } = tokens;

  const bg0 = locked ? line : bg;

  const bg1 = locked ? surface : primary;

  const uid = `${themeId}${v}${locked ? 'L' : 'U'}`;

  const defs = gradBg(`g${uid}`, bg0, bg1, locked);

  const fill = `url(#g${uid})`;

  const a = locked ? 0.22 : 0.72;

  const a2 = locked ? 0.14 : 0.45;

  let body = '';

  switch (themeId) {
    case 'neon':
      body = `<circle cx="${90 + v * 18}" cy="${120 + v * 40}" r="${55 + v * 6}" fill="${primary}" opacity="${a2}"/>

<circle cx="${270 - v * 12}" cy="${320 - v * 20}" r="${75 + v * 8}" fill="${accent}" opacity="${a2}"/>

<circle cx="${180 + v * 10}" cy="${520 - v * 30}" r="${45 + v * 5}" fill="${primary}" opacity="${a}"/>

<rect x="40" y="${200 + v * 50}" width="280" height="3" fill="${primary}" opacity="${locked ? 0.2 : 0.55}"/>

<rect x="60" y="${420 + v * 15}" width="240" height="2" fill="${accent}" opacity="${locked ? 0.15 : 0.4}"/>`;

      break;

    case 'pop':
      body = `<rect x="${40 + v * 8}" y="80" width="200" height="280" fill="${primary}" opacity="${a}" transform="rotate(${-3 + v} 140 220)"/>

<rect x="${120 + v * 6}" y="200" width="180" height="320" fill="${accent}" opacity="${a2}" transform="rotate(${5 - v} 210 360)"/>`;

      break;

    case 'forest':
      body = `<circle cx="${300 - v * 20}" cy="${90 + v * 10}" r="50" fill="${accent}" opacity="${locked ? 0.12 : 0.35}"/>

<path d="M${60 + v * 25} 520 L${110 + v * 12} 280 L${160 - v * 8} 520Z" fill="${primary}" opacity="${a}"/>

<rect x="${118 + v * 4}" y="420" width="20" height="100" fill="${accent}" opacity="${a2}"/>

<path d="M${180 + v * 18} 520 L${230 + v * 8} 300 L${280 - v * 6} 520Z" fill="${primary}" opacity="${a * 0.85}"/>

<rect x="${228 + v * 3}" y="430" width="18" height="90" fill="${accent}" opacity="${a2}"/>

<path d="M${250 + v * 10} 520 L${290 + v * 5} 340 L${330 - v * 4} 520Z" fill="${primary}" opacity="${a * 0.7}"/>`;

      break;

    case 'arcade':
      body = `<rect x="${80 + v * 14}" y="120" width="80" height="80" fill="${primary}" opacity="${a}"/>

<rect x="${180 + v * 10}" y="220" width="60" height="60" fill="${accent}" opacity="${a}"/>

<rect x="${100 + v * 8}" y="360" width="100" height="50" fill="${primary}" opacity="${a2}"/>

<rect x="${220 - v * 6}" y="480" width="70" height="70" fill="${accent}" opacity="${a}"/>`;

      break;

    case 'sakura':
      body = `<path d="M20 ${80 + v * 20} Q120 40 200 ${100 + v * 15}" stroke="${primary}" stroke-width="3" fill="none" opacity="${a}"/>

<circle cx="${60 + v * 30}" cy="${140 + v * 25}" r="14" fill="${accent}" opacity="${a}"/>

<circle cx="${120 + v * 20}" cy="${100 + v * 15}" r="11" fill="${accent}" opacity="${a2}"/>

<circle cx="${200 - v * 15}" cy="${180 + v * 10}" r="12" fill="${accent}" opacity="${a2}"/>

<circle cx="${90 + v * 25}" cy="${280 + v * 20}" r="9" fill="${accent}" opacity="${a2}"/>

<circle cx="${250 - v * 18}" cy="${350 + v * 12}" r="10" fill="${accent}" opacity="${a2}"/>

<path d="M40 480 Q180 420 300 500" stroke="${primary}" stroke-width="2" fill="none" opacity="${locked ? 0.15 : 0.3}"/>`;

      break;

    case 'shrine': {
      const skies = [
        ['#87ceeb', '#f5d78e', '#c0392b'],

        ['#2c3e50', '#e67e22', '#f1c40f'],

        ['#87ceeb', '#f5d78e', '#c0392b'],

        ['#34495e', '#d35400', '#f39c12'],

        ['#5dade2', '#f7dc6f', '#c0392b'],
      ];

      const [c0, c1, c2] = skies[v];

      const shrineDefs = `<defs><linearGradient id="sh${uid}" x1="0" y1="0" x2="0" y2="1">

<stop offset="0%" stop-color="${locked ? line : c0}"/>

<stop offset="55%" stop-color="${locked ? surface : c1}"/>

<stop offset="100%" stop-color="${locked ? line : c2}"/>

</linearGradient></defs>`;

      const torii = locked
        ? `<path d="M6 38h52M10 38V22M54 38V22M4 22h56M32 10v12" stroke="#aaa" stroke-width="3"/><path d="M22 22h20v16H22z" fill="#bbb" opacity="0.5"/>`
        : `<path d="M6 38h52M10 38V22M54 38V22M4 22h56M32 10v12" stroke="#c0392b" stroke-width="3"/><path d="M22 22h20v16H22z" fill="#c0392b" opacity="0.85"/><path d="M18 18 Q32 6 46 18" stroke="#d4a012" stroke-width="2.5" fill="none"/>`;

      return portraitSvg(
        shrineDefs,

        `url(#sh${uid})`,

        `<g transform="translate(108,220) scale(3.8)">${torii}</g>`,
      );
    }

    case 'atlas':
      body = `<circle cx="180" cy="300" r="110" fill="none" stroke="${primary}" stroke-width="3" opacity="${a}"/>

<polygon points="180,200 195,300 180,275 165,300" fill="${accent}" opacity="${a}"/>

<polygon points="180,400 195,300 180,325 165,300" fill="${primary}" opacity="${a2}"/>

<polygon points="80,300 180,315 165,300 180,285" fill="${accent}" opacity="${a2}"/>

<polygon points="280,300 180,315 195,300 180,285" fill="${primary}" opacity="${a2}"/>

<circle cx="180" cy="300" r="10" fill="${primary}" opacity="${locked ? 0.25 : 0.85}"/>`;

      break;

    case 'scrapbook':
      body = `<rect x="${50 + v * 10}" y="100" width="200" height="260" rx="6" fill="${accent}" opacity="${a2}" transform="rotate(${-5 + v} 150 230)"/>

<rect x="${120 + v * 8}" y="240" width="190" height="280" rx="6" fill="${primary}" opacity="${a}" transform="rotate(${7 - v} 215 380)"/>

<rect x="${70 + v * 6}" y="180" width="60" height="18" fill="#f0e4dc" opacity="0.6" transform="rotate(-8 100 189)"/>`;

      break;

    case 'liquid':
      body = `<circle cx="${100 + v * 25}" cy="180" r="100" fill="${accent}" opacity="${locked ? 0.08 : 0.32}"/>

<circle cx="${260 - v * 15}" cy="380" r="120" fill="${primary}" opacity="${locked ? 0.06 : 0.22}"/>

<circle cx="${180 + v * 10}" cy="520" r="80" fill="${accent}" opacity="${locked ? 0.07 : 0.28}"/>

<rect x="30" y="280" width="300" height="70" rx="35" fill="#fff" opacity="${locked ? 0.04 : 0.1}"/>`;

      break;

    default:
      body = `<circle cx="180" cy="280" r="90" fill="${primary}" opacity="${a2}"/>`;
  }

  return portraitSvg(defs, fill, body);
}

function buildArtSvg(themeId: BuiltinThemeId, variant: number, locked: boolean): string {
  const uid = `${themeId}${variant}${locked ? 'l' : 'u'}`;
  const tokens = BUILTIN_THEME_MAP[themeId].tokens;

  switch (themeId) {
    case 'zen':
      return zenScene(variant, locked);
    case 'kiyo':
      return kiyoScene(variant, locked, uid);
    case 'wamon':
      return wamonScene(variant, locked, uid);
    case 'sumi':
      return sumiScene(variant, locked);
    case 'kawaii':
      return kawaiiScene(variant, locked);
    case 'izakaya':
      return izakayaScene(variant, locked);
    default:
      return genericScene(themeId, variant, locked, tokens);
  }
}

const unlockedCache = new Map<string, string>();

const lockedCache = new Map<string, string>();

function cached(
  cache: Map<string, string>,

  themeId: BuiltinThemeId,

  variant: number,

  locked: boolean,
): string {
  const key = `${themeId}:${variant}:${locked ? 'L' : 'U'}`;

  const hit = cache.get(key);

  if (hit) return hit;

  const url = svgDataUrl(buildArtSvg(themeId, variant, locked));

  cache.set(key, url);

  return url;
}

/** Full-color default artwork for found/generated cards (5 variants). */

export function themeUnlockedArtImage(cosmeticsId: string, index: number): string {
  const themeId = normalizeCosmeticsId(cosmeticsId);

  return cached(unlockedCache, themeId, index % THEME_UNLOCKED_ART_COUNT, false);
}

/** Muted preview for locked cards before scan (3 variants). */

export function themeLockedPreviewImage(cosmeticsId: string, index: number): string {
  const themeId = normalizeCosmeticsId(cosmeticsId);

  return cached(lockedCache, themeId, index % THEME_LOCKED_PREVIEW_COUNT, true);
}
