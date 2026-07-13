import { Component, inject, isDevMode, OnDestroy, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { SessionStore } from '../../core/stores/session.store';
import { PackStore } from '../../core/stores/pack.store';
import { Lang, LANGS } from '../../core/models';
import { environment } from '../../../environments/environment';
import { authErrorKey, isExpectedAuthError } from '../../core/auth-errors';

const ONBOARDED_KEY = 'qrhunt.onboarded';
const RETURNING_KEY = 'qrhunt.returning';

function isReturningVisitor(): boolean {
  return (
    localStorage.getItem(ONBOARDED_KEY) === '1' || localStorage.getItem(RETURNING_KEY) === '1'
  );
}

@Component({
  selector: 'app-auth-page',
  imports: [FormsModule, TranslocoModule],
  template: `
    <div class="min-h-dvh flex flex-col items-center justify-center p-6 gap-6">
      <!-- language picker -->
      <div class="flex gap-2">
        @for (lang of langs; track lang) {
          <button
            class="btn-ghost !min-h-10 px-3 text-sm"
            [class.!bg-primary]="activeLang() === lang"
            [class.!text-primary-ink]="activeLang() === lang"
            (click)="setLang(lang)"
          >
            {{ lang.toUpperCase() }}
          </button>
        }
      </div>

      <h1 class="text-3xl font-extrabold text-center flex items-center justify-center gap-2 flex-wrap">
        <span>{{ pack.event()?.theme?.logoText ?? 'QR Hunt' }}</span>
        @if (deployLabel) {
          <span
            class="text-xs font-bold uppercase tracking-wide text-muted border border-line rounded px-1.5 py-0.5"
          >
            {{ deployLabel }}
          </span>
        }
      </h1>

      @if (!onboarded()) {
        <!-- onboarding slides -->
        <div class="card p-6 w-full max-w-sm text-center flex flex-col gap-4">
          <div class="text-5xl">{{ ['🔍', '🎨', '🏆'][slide()] }}</div>
          <h2 class="text-xl font-bold">
            {{ 'onboarding.slides.' + slideKey() + '.title' | transloco }}
          </h2>
          <p class="text-muted">
            {{ 'onboarding.slides.' + slideKey() + '.text' | transloco }}
          </p>
          <div class="flex justify-center gap-2">
            @for (i of [0, 1, 2]; track i) {
              <span
                class="w-2.5 h-2.5 rounded-full"
                [class.bg-primary]="slide() === i"
                [class.bg-line]="slide() !== i"
              ></span>
            }
          </div>
          <button class="btn-primary w-full" (click)="nextSlide()">
            {{ (slide() < 2 ? 'onboarding.next' : 'onboarding.start') | transloco }}
          </button>
        </div>
      } @else {
        <!-- login / register -->
        <form
          class="card p-6 w-full max-w-sm flex flex-col gap-4"
          (ngSubmit)="submit()"
        >
          <h2 class="text-xl font-bold text-center">{{ 'auth.welcome' | transloco }}</h2>
          <div>
            <label class="label" for="nickname">{{ 'auth.nickname' | transloco }}</label>
            <input
              id="nickname"
              class="input"
              [(ngModel)]="nickname"
              name="nickname"
              autocomplete="username"
              required
            />
          </div>
          <div>
            <label class="label" for="password">{{ 'auth.password' | transloco }}</label>
            <input
              id="password"
              class="input"
              type="password"
              [(ngModel)]="password"
              name="password"
              [autocomplete]="mode() === 'login' ? 'current-password' : 'new-password'"
              required
            />
          </div>
          @if (mode() === 'register') {
            <div>
              <label class="label" for="email">{{ 'auth.email' | transloco }}</label>
              <input
                id="email"
                class="input"
                type="email"
                [(ngModel)]="email"
                name="email"
                autocomplete="email"
              />
            </div>
          }
          @if (error()) {
            <p class="text-bad text-sm font-semibold">{{ error()! | transloco }}</p>
          }
          <button class="btn-primary w-full" type="submit" [disabled]="busy()">
            {{ (mode() === 'login' ? 'auth.login' : 'auth.register') | transloco }}
          </button>
          <button type="button" class="text-primary text-sm font-semibold" (click)="toggleMode()">
            {{
              (mode() === 'login' ? 'auth.switchToRegister' : 'auth.switchToLogin') | transloco
            }}
          </button>
        </form>
      }
    </div>
  `,
})
export class AuthPage implements OnDestroy {
  readonly deployLabel = environment.deployLabel;
  private readonly session = inject(SessionStore);
  private readonly transloco = inject(TranslocoService);
  private readonly router = inject(Router);
  readonly pack = inject(PackStore);

  readonly langs = LANGS;
  readonly slide = signal(0);
  readonly onboarded = signal(isReturningVisitor());
  readonly mode = signal<'login' | 'register'>(isReturningVisitor() ? 'login' : 'register');
  readonly error = signal<string | null>(null);
  readonly busy = signal(false);

  nickname = '';
  password = '';
  email = '';

  activeLang(): string {
    return this.transloco.getActiveLang();
  }

  ngOnDestroy(): void {
    localStorage.setItem(RETURNING_KEY, '1');
  }

  slideKey(): string {
    return ['one', 'two', 'three'][this.slide()];
  }

  setLang(lang: Lang): void {
    void this.session.setLanguage(lang);
  }

  nextSlide(): void {
    if (this.slide() < 2) {
      this.slide.update((s) => s + 1);
    } else {
      localStorage.setItem(ONBOARDED_KEY, '1');
      this.onboarded.set(true);
      this.mode.set('register');
    }
  }

  toggleMode(): void {
    this.mode.update((m) => (m === 'login' ? 'register' : 'login'));
    this.error.set(null);
  }

  async submit(): Promise<void> {
    this.error.set(null);
    if (!this.nickname.trim() || !this.password) {
      this.error.set('auth.errors.required');
      return;
    }
    this.busy.set(true);
    try {
      const creds = {
        nickname: this.nickname,
        password: this.password,
        email: this.email || undefined,
        language: this.activeLang() as Lang,
      };
      if (this.mode() === 'login') {
        await this.session.login(creds);
      } else {
        await this.session.register(creds);
      }
      localStorage.setItem(ONBOARDED_KEY, '1');
      localStorage.setItem(RETURNING_KEY, '1');
      await this.router.navigate([this.session.homeRoute()]);
    } catch (e) {
      if (isDevMode() && !isExpectedAuthError(e)) {
        console.error('[auth]', e);
      }
      this.error.set(authErrorKey(e, this.mode()));
    } finally {
      this.busy.set(false);
    }
  }
}
