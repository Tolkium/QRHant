import { computed, inject, Injectable, signal } from '@angular/core';
import { CodesApi } from '../backend/api';
import { HuntEvent, OfflinePack } from '../models';
import { idbGet, idbPut } from '../db/idb';
import { FindsStore } from './finds.store';
import { SessionStore } from './session.store';
import { ThemeStore } from './theme.store';
import { normalizeThemeConfig } from '../themes/theme-utils';

const DEVICE_EVENT = 'device:event';
const DEVICE_PACK = 'device:pack';

/**
 * Device-side cache of the active event and its offline pack. Once loaded,
 * scanning works with zero connectivity; refresh() is a best-effort update
 * that silently keeps the cache when offline.
 */
@Injectable({ providedIn: 'root' })
export class PackStore {
  private readonly codes = inject(CodesApi);
  private readonly finds = inject(FindsStore);
  private readonly themes = inject(ThemeStore);
  private readonly session = inject(SessionStore);

  private readonly _event = signal<HuntEvent | null>(null);
  private readonly _pack = signal<OfflinePack | null>(null);
  /** Ticks every second so date-derived lifecycle phases update without a refresh. */
  private readonly _clock = signal(Date.now());

  readonly event = this._event.asReadonly();
  readonly pack = this._pack.asReadonly();
  readonly clock = this._clock.asReadonly();

  constructor() {
    setInterval(() => this._clock.set(Date.now()), 1000);
  }

  readonly releasedEntries = computed(() => {
    const pack = this._pack();
    if (!pack) return [];
    const now = this._clock();
    return pack.entries.filter((e) => !e.releaseAt || Date.parse(e.releaseAt) <= now);
  });

  readonly eventPhase = computed<'setup' | 'live' | 'ended' | null>(() => {
    const event = this._event();
    if (!event) return null;
    const now = this._clock();
    if (event.state !== 'live') return event.state;
    if (now < Date.parse(event.startsAt)) return 'setup';
    if (now > Date.parse(event.endsAt)) return 'ended';
    return 'live';
  });

  private applyThemeForEvent(event: HuntEvent): void {
    const config = normalizeThemeConfig(event.theme, event.name);
    this.themes.applyForEvent(config, this.session.user()?.preferredThemeId ?? null);
  }

  /** Load cached data instantly, then try the network. */
  async load(): Promise<void> {
    const cachedEvent = await idbGet<HuntEvent>('kv', DEVICE_EVENT);
    const cachedPack = await idbGet<OfflinePack>('kv', DEVICE_PACK);
    if (cachedEvent) {
      this._event.set(cachedEvent);
      this.applyThemeForEvent(cachedEvent);
    }
    if (cachedPack) this._pack.set(cachedPack);
    await this.refresh();
  }

  /** Best-effort refresh; no-op offline. Re-downloads the pack when stale. */
  async refresh(): Promise<void> {
    try {
      const event = await this.codes.getActiveEvent();
      if (!event) return;
      this._event.set(event);
      this.applyThemeForEvent(event);
      await idbPut('kv', DEVICE_EVENT, event);

      const current = this._pack();
      if (!current || current.eventId !== event.id || current.version < event.packVersion) {
        const pack = await this.codes.getPack(event.id);
        this._pack.set(pack);
        await idbPut('kv', DEVICE_PACK, pack);
        await this.finds.rehydrateFromPack(pack);
      }
    } catch {
      // offline — cached data stays authoritative
    }
  }

  /** Re-apply when user changes theme preference. */
  reapplyTheme(): void {
    const event = this._event();
    if (event) this.applyThemeForEvent(event);
  }
}
