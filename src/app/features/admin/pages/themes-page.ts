import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminState } from '../admin-state';
import { CustomTheme, EventThemeConfig } from '../../../core/models';
import { ThemeStore } from '../../../core/stores/theme.store';
import {
  allBuiltinPresets,
  exportCustomThemeJson,
  parseCustomThemeJson,
  resolveThemeTokens,
  sanitizeThemeConfig,
} from '../../../core/themes/theme-utils';
import {
  DEFAULT_BUILTIN_THEME_ID,
  MAX_PLAYER_THEMES,
} from '../../../core/themes/theme-registry';
import { ThemeSwatch } from '../../../shared/theme-swatch';

@Component({
  selector: 'app-themes-page',
  imports: [FormsModule, ThemeSwatch],
  template: `
    <h1 class="text-2xl font-extrabold mb-2">Themes</h1>
    <p class="text-sm text-muted mb-4 max-w-2xl">
      Pick the default look and up to {{ maxThemes }} themes players can switch between.
      Design custom themes in the <a href="/design/" target="_blank" class="text-primary font-semibold underline">design lab</a>,
      then upload the exported JSON here.
    </p>

    @if (draft(); as t) {
      <div class="flex flex-col gap-6 max-w-3xl">
        <section class="card p-4 flex flex-col gap-4">
          <h2 class="font-bold">Branding</h2>
          <div class="grid md:grid-cols-2 gap-4">
            <div>
              <label class="label" for="brand-event">Displayed event name</label>
              <input id="brand-event" class="input" [(ngModel)]="t.eventName" />
            </div>
            <div>
              <label class="label" for="brand-logo">Header logo text</label>
              <input id="brand-logo" class="input" [(ngModel)]="t.logoText" />
            </div>
          </div>
        </section>

        <section class="card p-4 flex flex-col gap-4">
          <label class="flex items-start gap-3">
            <input type="checkbox" class="w-5 h-5 mt-0.5" [(ngModel)]="t.themePickerEnabled" />
            <span>
              <span class="font-semibold block">Let players choose a theme</span>
              <span class="text-sm text-muted">
                When off, everyone sees the default. When on, profile shows enabled themes.
              </span>
            </span>
          </label>
        </section>

        <section class="card p-4 flex flex-col gap-4">
          <div class="flex items-center justify-between gap-2 flex-wrap">
            <h2 class="font-bold">Built-in presets</h2>
            <p class="text-sm text-muted">{{ enabledCount() }} / {{ maxThemes }} selected</p>
          </div>
          <p class="text-sm text-muted">Click to enable/disable. Star sets default.</p>
          <div class="flex flex-wrap gap-2">
            @for (preset of builtins; track preset.id) {
              <div class="flex items-center gap-1">
                <app-theme-swatch
                  [name]="preset.name"
                  [tokens]="preset.tokens"
                  [active]="isEnabled(preset.id)"
                  (selected)="toggleBuiltin(preset.id)"
                />
                <button
                  type="button"
                  class="btn-ghost !min-h-9 !px-2 text-lg"
                  [class.!bg-primary]="t.defaultPresetId === preset.id"
                  [class.!text-primary-ink]="t.defaultPresetId === preset.id"
                  [disabled]="!isEnabled(preset.id)"
                  (click)="setDefault(preset.id)"
                  [attr.aria-label]="'Default: ' + preset.name"
                >
                  ★
                </button>
              </div>
            }
          </div>
        </section>

        <section class="card p-4 flex flex-col gap-4">
          <h2 class="font-bold">Custom themes</h2>
          <p class="text-sm text-muted">
            Upload JSON from the design lab. Optional <code class="text-xs">extends</code> field reuses a built-in frame style.
          </p>

          @if (t.customThemes.length) {
            <ul class="flex flex-col gap-2">
              @for (ct of t.customThemes; track ct.id) {
                <li class="flex flex-wrap items-center gap-2 justify-between border border-line rounded-xl p-3">
                  <div class="flex flex-col gap-0.5">
                    <app-theme-swatch
                      [name]="ct.name"
                      [tokens]="ct.tokens"
                      [active]="isEnabled(ct.id)"
                      (selected)="toggleCustom(ct.id)"
                    />
                    @if (ct.extends) {
                      <span class="text-xs text-muted pl-1">Extends {{ ct.extends }}</span>
                    }
                  </div>
                  <div class="flex gap-2">
                    <button type="button" class="btn-ghost !min-h-9" (click)="exportCustom(ct)">
                      Export JSON
                    </button>
                    <button type="button" class="btn-danger !min-h-9" (click)="deleteCustom(ct.id)">
                      Delete
                    </button>
                  </div>
                </li>
              }
            </ul>
          }

          <label class="btn-ghost w-fit cursor-pointer">
            Upload theme JSON
            <input type="file" accept="application/json,.json" class="hidden" (change)="uploadJson($event)" />
          </label>
          @if (customError()) {
            <p class="text-bad text-sm font-semibold">{{ customError() }}</p>
          }
        </section>

        <section class="card p-4 flex flex-col gap-3">
          <h2 class="font-bold">Preview</h2>
          <p class="text-sm text-muted">Applies the default theme to this admin view without saving.</p>
          <button type="button" class="btn-ghost w-fit" (click)="previewDefault()">Preview default theme</button>
        </section>

        <div class="flex gap-2 justify-end">
          <button class="btn-primary" (click)="save()">Save themes</button>
        </div>
        @if (saved()) {
          <p class="text-good font-semibold text-sm text-right">Saved.</p>
        }
        @if (saveError()) {
          <p class="text-bad font-semibold text-sm text-right">{{ saveError() }}</p>
        }
      </div>
    }
  `,
})
export class ThemesPage {
  private readonly state = inject(AdminState);
  private readonly themes = inject(ThemeStore);

  readonly builtins = allBuiltinPresets();
  readonly maxThemes = MAX_PLAYER_THEMES;
  readonly saved = signal(false);
  readonly saveError = signal<string | null>(null);
  readonly customError = signal<string | null>(null);
  readonly draft = signal<EventThemeConfig | null>(null);

  readonly enabledCount = computed(() => this.draft()?.enabledPresetIds.length ?? 0);

  constructor() {
    let lastEventId: string | null = null;
    effect(() => {
      const selected = this.state.selected();
      if (selected && lastEventId !== selected.id) {
        lastEventId = selected.id;
        untracked(() => this.draft.set(structuredClone(selected.theme)));
      } else if (!selected) {
        lastEventId = null;
        this.draft.set(null);
      }
    });
  }

  isEnabled(id: string): boolean {
    return this.draft()?.enabledPresetIds.includes(id) ?? false;
  }

  toggleBuiltin(id: string): void {
    const t = this.draft();
    if (!t) return;
    const set = new Set(t.enabledPresetIds);
    if (set.has(id)) {
      if (set.size <= 1) return;
      set.delete(id);
      if (t.defaultPresetId === id) {
        t.defaultPresetId = [...set][0];
      }
    } else if (set.size < MAX_PLAYER_THEMES) {
      set.add(id);
    }
    t.enabledPresetIds = [...set];
    this.draft.set({ ...t });
  }

  toggleCustom(id: string): void {
    this.toggleBuiltin(id);
  }

  setDefault(id: string): void {
    const t = this.draft();
    if (!t || !t.enabledPresetIds.includes(id)) return;
    t.defaultPresetId = id;
    this.draft.set({ ...t });
  }

  uploadJson(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result as string;
      const result = parseCustomThemeJson(text, file.name.replace(/\.json$/i, ''));
      if ('error' in result) {
        this.customError.set(result.error);
        return;
      }
      this.customError.set(null);
      this.appendCustom(result.name, result.tokens, result.extends);
    };
    reader.readAsText(file);
  }

  private appendCustom(name: string, tokens: CustomTheme['tokens'], extendsId?: string): void {
    const t = this.draft();
    if (!t) return;
    if (t.enabledPresetIds.length >= MAX_PLAYER_THEMES) {
      this.customError.set(`Maximum ${MAX_PLAYER_THEMES} themes per event.`);
      return;
    }
    const custom: CustomTheme = {
      id: crypto.randomUUID(),
      name,
      tokens,
      extends: extendsId,
      createdAt: new Date().toISOString(),
    };
    t.customThemes = [...t.customThemes, custom];
    t.enabledPresetIds = [...t.enabledPresetIds, custom.id];
    this.draft.set({ ...t });
  }

  deleteCustom(id: string): void {
    const t = this.draft();
    if (!t) return;
    t.customThemes = t.customThemes.filter((c) => c.id !== id);
    t.enabledPresetIds = t.enabledPresetIds.filter((x) => x !== id);
    if (t.defaultPresetId === id) {
      t.defaultPresetId = t.enabledPresetIds[0] ?? DEFAULT_BUILTIN_THEME_ID;
    }
    this.draft.set({ ...t });
  }

  exportCustom(theme: CustomTheme): void {
    const blob = new Blob([exportCustomThemeJson(theme)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${theme.name.replace(/\s+/g, '-').toLowerCase()}-theme.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  previewDefault(): void {
    const t = this.draft();
    if (!t) return;
    const sanitized = sanitizeThemeConfig(t);
    const resolved = resolveThemeTokens(sanitized, sanitized.defaultPresetId);
    this.themes.applyResolved(
      sanitized,
      resolved.id,
      resolved.name,
      resolved.tokens,
      resolved.cosmeticsId,
    );
  }

  async save(): Promise<void> {
    const selected = this.state.selected();
    const d = this.draft();
    if (!selected || !d) return;
    const sanitized = sanitizeThemeConfig(d);
    this.saveError.set(null);
    await this.state.updateEvent({ ...selected, theme: sanitized });
    this.draft.set(structuredClone(sanitized));
    this.saved.set(true);
    setTimeout(() => this.saved.set(false), 2000);
  }
}
