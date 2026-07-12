import { computed, inject, Injectable, Injector, signal } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { AuthApi, Credentials } from '../backend/api';
import { Lang, Profile } from '../models';
import { PackStore } from './pack.store';

const PLAYER_VIEW_KEY = 'qrhunt.adminPlayerView';

@Injectable({ providedIn: 'root' })
export class SessionStore {
  private readonly auth = inject(AuthApi);
  private readonly transloco = inject(TranslocoService);
  private readonly injector = inject(Injector);

  private readonly _user = signal<Profile | null>(null);
  private readonly _restored = signal(false);
  private readonly _playerViewMode = signal(localStorage.getItem(PLAYER_VIEW_KEY) === '1');

  readonly user = this._user.asReadonly();
  readonly restored = this._restored.asReadonly();
  readonly isLoggedIn = computed(() => this._user() !== null);
  readonly isAdmin = computed(() => this._user()?.role === 'admin');
  readonly playerViewMode = this._playerViewMode.asReadonly();
  readonly prefersHuntView = computed(() => this.isAdmin() && this._playerViewMode());
  readonly homeRoute = computed(() =>
    this.isAdmin() && !this._playerViewMode() ? '/admin' : '/hunt',
  );

  /**
   * Offline-tolerant session restore: any failure (e.g. no connectivity in
   * the real backend) must never gate the app shell — it resolves to null and
   * the router decides.
   */
  async restore(): Promise<void> {
    try {
      const user = await this.auth.restoreSession();
      this._user.set(user);
      if (user) this.applyLanguage(user.language);
    } catch {
      this._user.set(null);
    } finally {
      this._restored.set(true);
    }
  }

  async login(creds: Credentials): Promise<void> {
    const user = await this.auth.login(creds);
    this._user.set(user);
    this.applyLanguage(user.language);
    this.injector.get(PackStore).reapplyTheme();
  }

  async register(creds: Credentials): Promise<void> {
    const user = await this.auth.register(creds);
    this._user.set(user);
    this.applyLanguage(user.language);
    this.injector.get(PackStore).reapplyTheme();
  }

  async logout(): Promise<void> {
    await this.auth.logout();
    this._user.set(null);
    this.injector.get(PackStore).reapplyTheme();
  }

  setPlayerViewMode(enabled: boolean): void {
    this._playerViewMode.set(enabled);
    if (enabled) localStorage.setItem(PLAYER_VIEW_KEY, '1');
    else localStorage.removeItem(PLAYER_VIEW_KEY);
  }

  async setLanguage(language: Lang): Promise<void> {
    this.applyLanguage(language);
    if (this._user()) {
      this._user.set(await this.auth.updateProfile({ language }));
    }
  }

  async setAvatar(avatar: string): Promise<void> {
    if (this._user()) {
      this._user.set(await this.auth.updateProfile({ avatar }));
    }
  }

  async setPreferredTheme(themeId: string | null): Promise<void> {
    if (this._user()) {
      this._user.set(await this.auth.updateProfile({ preferredThemeId: themeId }));
      this.injector.get(PackStore).reapplyTheme();
    }
  }

  private applyLanguage(lang: Lang): void {
    this.transloco.setActiveLang(lang);
    localStorage.setItem('qrhunt.lang', lang);
  }
}
