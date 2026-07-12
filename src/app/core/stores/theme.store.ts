import { Injectable, computed, signal } from '@angular/core';
import { EventThemeConfig, ThemeTokens } from '../models';
import { resolveThemeTokens, normalizeThemeConfig } from '../themes/theme-utils';

export interface AppliedTheme {
  id: string;
  name: string;
  tokens: ThemeTokens;
  cosmeticsId: string;
  config: EventThemeConfig;
}

/** Applies preset/custom theme tokens as CSS variables on the document root. */
@Injectable({ providedIn: 'root' })
export class ThemeStore {
  private readonly _applied = signal<AppliedTheme | null>(null);
  readonly applied = this._applied.asReadonly();
  readonly activeId = computed(() => this._applied()?.id ?? null);
  readonly config = computed(() => this._applied()?.config ?? null);

  /**
   * Resolve and apply the effective theme for the active event.
   * @param userPreferredId Player profile preference; ignored when picker is off.
   */
  applyForEvent(config: EventThemeConfig, userPreferredId: string | null = null): void {
    const normalized = normalizeThemeConfig(config, config.eventName);
    const canPick = normalized.themePickerEnabled;
    const themeId = canPick ? userPreferredId : null;
    const resolved = resolveThemeTokens(normalized, themeId);
    this.applyResolved(
      normalized,
      resolved.id,
      resolved.name,
      resolved.tokens,
      resolved.cosmeticsId,
    );
  }

  applyResolved(
    config: EventThemeConfig,
    id: string,
    name: string,
    tokens: ThemeTokens,
    cosmeticsId: string = id,
  ): void {
    this._applied.set({ id, name, tokens, cosmeticsId, config });
    const root = document.documentElement;
    root.dataset['activeTheme'] = cosmeticsId;
    root.dataset['themeId'] = id;
    const style = root.style;
    style.setProperty('--c-primary', tokens.primary);
    style.setProperty('--c-primary-ink', tokens.primaryInk);
    style.setProperty('--c-accent', tokens.accent);
    style.setProperty('--c-bg', tokens.bg);
    style.setProperty('--c-surface', tokens.surface);
    style.setProperty('--c-ink', tokens.ink);
    style.setProperty('--c-muted', tokens.muted);
    style.setProperty('--c-line', tokens.line);
    style.setProperty('--c-good', tokens.good);
    style.setProperty('--c-bad', tokens.bad);
    style.setProperty('--c-radius', tokens.radius);
    style.setProperty('--c-radius-lg', tokens.radiusLg);
    style.setProperty('--c-shadow', tokens.shadow);
    style.setProperty('--c-font', tokens.font);
    style.setProperty('--c-font-display', tokens.fontDisplay);
    style.fontFamily = tokens.font;

    const dark =
      tokens.bg.startsWith('#') &&
      parseInt(tokens.bg.slice(1, 3), 16) * 0.299 +
        parseInt(tokens.bg.slice(3, 5), 16) * 0.587 +
        parseInt(tokens.bg.slice(5, 7), 16) * 0.114 <
        128;
    root.style.colorScheme = dark ? 'dark' : 'light';
  }

  clear(): void {
    this._applied.set(null);
    delete document.documentElement.dataset['activeTheme'];
    delete document.documentElement.dataset['themeId'];
  }
}
