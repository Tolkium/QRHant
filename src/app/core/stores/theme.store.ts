import { Injectable, signal } from '@angular/core';
import { DEFAULT_THEME, EventTheme } from '../models';

/** Server-driven design: event theme JSON becomes CSS custom properties. */
@Injectable({ providedIn: 'root' })
export class ThemeStore {
  private readonly _theme = signal<EventTheme>(DEFAULT_THEME);
  readonly theme = this._theme.asReadonly();

  apply(theme: EventTheme): void {
    this._theme.set(theme);
    const root = document.documentElement.style;
    root.setProperty('--c-primary', theme.primary);
    root.setProperty('--c-primary-ink', theme.primaryInk);
    root.setProperty('--c-accent', theme.accent);
    root.setProperty('--c-bg', theme.bg);
    root.setProperty('--c-surface', theme.surface);
    root.setProperty('--c-ink', theme.ink);
  }
}
