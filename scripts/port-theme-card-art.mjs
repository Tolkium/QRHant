#!/usr/bin/env node
/** Sync portrait theme-card-art from Angular src to Supabase Deno _shared copy. */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const srcPath = join(root, 'src/app/core/themes/theme-card-art.ts');
const outPath = join(root, 'supabase/functions/_shared/theme-card-art.ts');

const src = readFileSync(srcPath, 'utf8');
const bodyStart = src.indexOf('// @deno-sync-start');
if (bodyStart < 0) throw new Error('Missing // @deno-sync-start marker in theme-card-art.ts');
const bodyFrom = src.indexOf('function svgDataUrl', bodyStart);
if (bodyFrom < 0) throw new Error('Could not find svgDataUrl after @deno-sync-start');

const dimPath = join(root, 'src/app/shared/image-dimensions.ts');
const dimSrc = readFileSync(dimPath, 'utf8');
const dimMatch = dimSrc.match(/CARD_ART = \{ width: (\d+), height: (\d+)/);
if (!dimMatch) throw new Error('Could not read CARD_ART from image-dimensions.ts');
const artW = dimMatch[1];
const artH = dimMatch[2];

const header = `/** Keep in sync with src/app/core/themes/theme-card-art.ts — run: node scripts/port-theme-card-art.mjs */

export const THEME_UNLOCKED_ART_COUNT = 5;
export const THEME_LOCKED_PREVIEW_COUNT = 3;

const W = ${artW};
const H = ${artH};

type ThemeId =
  | 'neon' | 'pop' | 'forest' | 'arcade' | 'sakura' | 'shrine' | 'atlas' | 'scrapbook'
  | 'kiyo' | 'liquid' | 'wamon' | 'sumi' | 'kawaii' | 'izakaya' | 'zen';

const DEFAULT_THEME: ThemeId = 'zen';

interface ThemeArtTokens {
  primary: string;
  accent: string;
  bg: string;
  surface: string;
  line: string;
  ink: string;
}

const THEME_TOKENS: Record<ThemeId, ThemeArtTokens> = {
  neon: { primary: '#22d3ee', accent: '#f472b6', bg: '#0c1222', surface: '#151d32', line: '#243049', ink: '#e8f4ff' },
  pop: { primary: '#db2777', accent: '#7c3aed', bg: '#faf5ff', surface: '#ffffff', line: '#e9d5ff', ink: '#1e1b2e' },
  forest: { primary: '#166534', accent: '#ca8a04', bg: '#f0fdf4', surface: '#ffffff', line: '#bbf7d0', ink: '#14532d' },
  arcade: { primary: '#6366f1', accent: '#f43f5e', bg: '#1e1b4b', surface: '#312e81', line: '#4338ca', ink: '#e0e7ff' },
  sakura: { primary: '#3d4a6b', accent: '#d4789a', bg: '#faf6f1', surface: '#fffefb', line: '#e8d5dc', ink: '#2a2438' },
  shrine: { primary: '#c0392b', accent: '#d4a012', bg: '#f5f0e6', surface: '#fffaf4', line: '#e8d4b8', ink: '#3d2314' },
  atlas: { primary: '#5c3d2e', accent: '#b8860b', bg: '#e8d5b0', surface: '#f4e4bc', line: '#c4a574', ink: '#2c1810' },
  scrapbook: { primary: '#ff6b9d', accent: '#4ecdc4', bg: '#fff8f3', surface: '#ffffff', line: '#f0e4dc', ink: '#2d2838' },
  kiyo: { primary: '#1d1d1f', accent: '#e8a0b8', bg: '#f5f5f7', surface: '#ffffff', line: '#e8e8ed', ink: '#1d1d1f' },
  liquid: { primary: '#ffffff', accent: '#a78bfa', bg: '#0a0a12', surface: 'rgba(255,255,255,0.12)', line: 'rgba(255,255,255,0.22)', ink: '#ffffff' },
  wamon: { primary: '#b5352d', accent: '#b8956a', bg: '#f5efe6', surface: '#faf6ef', line: '#e8dfd2', ink: '#3d2c1e' },
  sumi: { primary: '#1a1a1a', accent: '#e60012', bg: '#ffffff', surface: '#fafafa', line: '#e8e8e8', ink: '#1a1a1a' },
  kawaii: { primary: '#e8919d', accent: '#f4a0b0', bg: '#fff8f9', surface: '#ffffff', line: '#f5e0e4', ink: '#5d4037' },
  izakaya: { primary: '#E9542E', accent: '#2D3277', bg: '#2D3277', surface: '#3a4090', line: '#4a5099', ink: '#ffffff' },
  zen: { primary: '#1a1a1a', accent: '#c41e3a', bg: '#faf6ef', surface: '#f5f0e6', line: '#e8dfd2', ink: '#1a1a1a' },
};

function isThemeId(id: string): id is ThemeId {
  return id in THEME_TOKENS;
}

export function normalizeCosmeticsId(id: string | null | undefined): ThemeId {
  if (id && isThemeId(id)) return id;
  return DEFAULT_THEME;
}

export function cosmeticsIdFromEventTheme(theme: unknown): ThemeId {
  if (!theme || typeof theme !== 'object') return DEFAULT_THEME;
  const raw = theme as { defaultPresetId?: string };
  return normalizeCosmeticsId(raw.defaultPresetId);
}

`;

let body = src.slice(bodyFrom);
body = body.replace(/BuiltinThemeId/g, 'ThemeId');
body = body.replace(/BUILTIN_THEME_MAP\[themeId\]\.tokens/g, 'THEME_TOKENS[themeId]');
body = body.replace(
  /type ThemeTokens = \(typeof BUILTIN_THEME_MAP\)\[BuiltinThemeId\]\['tokens'\];/,
  'type ThemeTokens = ThemeArtTokens;',
);
body = body.replace(
  /type ThemeTokens = \(typeof BUILTIN_THEME_MAP\)\[ThemeId\]\['tokens'\];/,
  'type ThemeTokens = ThemeArtTokens;',
);

writeFileSync(outPath, header + body);
console.log('Wrote', outPath);
