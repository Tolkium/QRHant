import {
  CustomTheme,
  EventThemeConfig,
  ThemeRef,
  ThemeTokens,
} from '../models';
import {
  BUILTIN_THEME_MAP,
  BUILTIN_THEME_PRESETS,
  BuiltinThemeId,
  DEFAULT_BUILTIN_THEME_ID,
  DEFAULT_ENABLED_THEME_IDS,
  MAX_PLAYER_THEMES,
} from './theme-registry';

const HEX = /^#[0-9a-fA-F]{6}$/;
const COLOR_KEYS = new Set([
  'primary',
  'primaryInk',
  'accent',
  'bg',
  'surface',
  'ink',
  'muted',
  'line',
  'good',
  'bad',
]);

function isColorValue(val: string): boolean {
  return HEX.test(val) || val.startsWith('rgba(') || val.startsWith('rgb(');
}

/** Legacy events.theme stored flat colors before preset system. */
interface LegacyEventTheme {
  primary?: string;
  primaryInk?: string;
  accent?: string;
  bg?: string;
  surface?: string;
  ink?: string;
  eventName?: string;
  logoText?: string;
  defaultPresetId?: string;
  enabledPresetIds?: string[];
  themePickerEnabled?: boolean;
  customThemes?: CustomTheme[];
}

export function isBuiltinThemeId(id: string): id is BuiltinThemeId {
  return id in BUILTIN_THEME_MAP;
}

export function normalizeThemeConfig(
  raw: unknown,
  eventName = 'QR Hunt',
): EventThemeConfig {
  const legacy = (raw ?? {}) as LegacyEventTheme;
  if (legacy.defaultPresetId && Array.isArray(legacy.enabledPresetIds)) {
    return sanitizeThemeConfig({
      defaultPresetId: legacy.defaultPresetId,
      enabledPresetIds: legacy.enabledPresetIds,
      themePickerEnabled: legacy.themePickerEnabled ?? false,
      customThemes: legacy.customThemes ?? [],
      eventName: legacy.eventName ?? eventName,
      logoText: legacy.logoText ?? eventName,
    });
  }
  return defaultThemeConfig(eventName, legacy.logoText ?? eventName);
}

export function defaultThemeConfig(
  eventName: string,
  logoText = eventName,
): EventThemeConfig {
  return {
    defaultPresetId: DEFAULT_BUILTIN_THEME_ID,
    enabledPresetIds: [...DEFAULT_ENABLED_THEME_IDS],
    themePickerEnabled: false,
    customThemes: [],
    eventName,
    logoText,
  };
}

export const DEFAULT_THEME_CONFIG: EventThemeConfig = defaultThemeConfig('QR Hunt');

export function sanitizeThemeConfig(config: EventThemeConfig): EventThemeConfig {
  const customThemes = (config.customThemes ?? []).filter((t) => t.id && t.name && t.tokens);
  const builtinIds = config.enabledPresetIds.filter(isBuiltinThemeId);
  const customIds = customThemes.map((t) => t.id);
  let enabled = [...new Set([...builtinIds, ...customIds])];

  const defaultId = enabled.includes(config.defaultPresetId)
    ? config.defaultPresetId
    : (enabled[0] ?? DEFAULT_BUILTIN_THEME_ID);

  if (!enabled.includes(defaultId)) {
    enabled = [defaultId, ...enabled];
  }

  enabled = enabled.slice(0, MAX_PLAYER_THEMES);

  return {
    defaultPresetId: defaultId,
    enabledPresetIds: enabled,
    themePickerEnabled: config.themePickerEnabled ?? false,
    customThemes,
    eventName: config.eventName?.trim() || 'QR Hunt',
    logoText: config.logoText?.trim() || config.eventName?.trim() || 'QR Hunt',
  };
}

export function listThemeRefs(config: EventThemeConfig): ThemeRef[] {
  const refs: ThemeRef[] = [];
  for (const id of config.enabledPresetIds) {
    if (isBuiltinThemeId(id)) {
      const preset = BUILTIN_THEME_MAP[id];
      refs.push({ id, name: preset.name, builtin: true, tokens: preset.tokens });
      continue;
    }
    const custom = config.customThemes.find((t) => t.id === id);
    if (custom) {
      refs.push({ id: custom.id, name: custom.name, builtin: false, tokens: custom.tokens });
    }
  }
  return refs;
}

export function resolveCosmeticsThemeId(
  config: EventThemeConfig,
  themeId: string,
): string {
  if (isBuiltinThemeId(themeId)) return themeId;
  const custom = config.customThemes.find((t) => t.id === themeId);
  if (custom?.extends && isBuiltinThemeId(custom.extends)) return custom.extends;
  return themeId;
}

export function resolveThemeTokens(
  config: EventThemeConfig,
  themeId: string | null | undefined,
): { id: string; name: string; tokens: ThemeTokens; cosmeticsId: string } {
  const allowed = new Set(config.enabledPresetIds);
  const pick =
    themeId && allowed.has(themeId)
      ? themeId
      : config.defaultPresetId;

  if (isBuiltinThemeId(pick)) {
    const preset = BUILTIN_THEME_MAP[pick];
    return { id: pick, name: preset.name, tokens: preset.tokens, cosmeticsId: pick };
  }

  const custom = config.customThemes.find((t) => t.id === pick);
  if (custom) {
    return {
      id: custom.id,
      name: custom.name,
      tokens: custom.tokens,
      cosmeticsId: resolveCosmeticsThemeId(config, custom.id),
    };
  }

  const fallback = BUILTIN_THEME_MAP[DEFAULT_BUILTIN_THEME_ID];
  return {
    id: DEFAULT_BUILTIN_THEME_ID,
    name: fallback.name,
    tokens: fallback.tokens,
    cosmeticsId: DEFAULT_BUILTIN_THEME_ID,
  };
}

export function validateThemeTokens(raw: unknown): ThemeTokens | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;
  const tokens = {} as ThemeTokens;
  const keys = [
    'primary',
    'primaryInk',
    'accent',
    'bg',
    'surface',
    'ink',
    'muted',
    'line',
    'good',
    'bad',
    'radius',
    'radiusLg',
    'shadow',
    'font',
    'fontDisplay',
  ] as const;
  for (const key of keys) {
    const val = obj[key];
    if (typeof val !== 'string' || !val.trim()) return null;
    if (COLOR_KEYS.has(key) && !isColorValue(val.trim())) return null;
    tokens[key] = val.trim();
  }
  return tokens;
}

export function parseCustomThemeJson(
  text: string,
  fallbackName = 'Custom theme',
): { name: string; tokens: ThemeTokens; extends?: string } | { error: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { error: 'Invalid JSON file.' };
  }
  if (!parsed || typeof parsed !== 'object') {
    return { error: 'Theme JSON must be an object.' };
  }
  const obj = parsed as Record<string, unknown>;
  const name = typeof obj['name'] === 'string' ? obj['name'].trim() : fallbackName;
  const tokenSource = obj['tokens'] ?? obj;
  const tokens = validateThemeTokens(tokenSource);
  if (!tokens) {
    return { error: 'Missing or invalid theme tokens. See export format in admin.' };
  }
  if (!name) return { error: 'Theme name is required.' };
  const extendsRaw = obj['extends'];
  const extendsId =
    typeof extendsRaw === 'string' && isBuiltinThemeId(extendsRaw.trim())
      ? extendsRaw.trim()
      : undefined;
  return { name, tokens, extends: extendsId };
}

export function exportCustomThemeJson(theme: CustomTheme): string {
  const payload: Record<string, unknown> = { name: theme.name, tokens: theme.tokens };
  if (theme.extends) payload['extends'] = theme.extends;
  return JSON.stringify(payload, null, 2);
}

export function allBuiltinPresets() {
  return BUILTIN_THEME_PRESETS;
}
