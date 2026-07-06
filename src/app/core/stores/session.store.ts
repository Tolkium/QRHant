import { computed, inject, Injectable, signal } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { AuthApi, Credentials } from '../backend/api';
import { Lang, Profile } from '../models';

@Injectable({ providedIn: 'root' })
export class SessionStore {
  private readonly auth = inject(AuthApi);
  private readonly transloco = inject(TranslocoService);

  private readonly _user = signal<Profile | null>(null);
  private readonly _restored = signal(false);

  readonly user = this._user.asReadonly();
  readonly restored = this._restored.asReadonly();
  readonly isLoggedIn = computed(() => this._user() !== null);
  readonly isAdmin = computed(() => this._user()?.role === 'admin');

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
  }

  async register(creds: Credentials): Promise<void> {
    const user = await this.auth.register(creds);
    this._user.set(user);
    this.applyLanguage(user.language);
  }

  async logout(): Promise<void> {
    await this.auth.logout();
    this._user.set(null);
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

  private applyLanguage(lang: Lang): void {
    this.transloco.setActiveLang(lang);
    localStorage.setItem('qrhunt.lang', lang);
  }
}
