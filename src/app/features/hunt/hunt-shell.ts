import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { TranslocoModule } from '@jsverse/transloco';
import { filter, map, startWith } from 'rxjs';
import { PackStore } from '../../core/stores/pack.store';
import { SessionStore } from '../../core/stores/session.store';
import { SyncEngine } from '../../core/sync/sync-engine';
import { InstallPromptService } from '../../core/pwa/install-prompt';
import { Avatar } from '../../shared/avatar';
import { environment } from '../../../environments/environment';
import { HuntThemeDeco } from './hunt-theme-deco';
import { HuntNavIcon } from './hunt-nav-icon';

@Component({
  selector: 'app-hunt-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, TranslocoModule, Avatar, HuntThemeDeco, HuntNavIcon],
  styles: `
    :host {
      display: block;
    }
    .hunt-lifecycle-banner {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.75rem 1rem;
      border-bottom: 1px solid var(--c-line);
      background: color-mix(in srgb, var(--c-surface) 88%, var(--c-bg));
    }
    .hunt-lifecycle-setup {
      flex-direction: column;
      text-align: center;
      gap: 0.35rem;
      padding: 1rem;
    }
  `,
  template: `
    <div class="hunt-app" [class.hunt-app--profile]="isProfileRoute()">
      <app-hunt-theme-deco />

      @if (isProfileRoute()) {
        <header class="hunt-header flex items-center justify-between">
          <span class="hunt-logo min-w-0">
            <span class="hunt-logo-name truncate">{{ 'profile.title' | transloco }}</span>
          </span>
          <a
            routerLink="/hunt/codes"
            class="hunt-header-back shrink-0"
            [attr.aria-label]="'common.back' | transloco"
          >
            ← {{ 'common.back' | transloco }}
          </a>
        </header>
      } @else {
        <header class="hunt-header flex items-center justify-between">
            <span class="hunt-logo flex items-center gap-1 min-w-0">
              <span class="hunt-logo-name truncate">{{ pack.event()?.theme?.logoText ?? 'QR Hunt' }}</span>
              @if (pack.eventPhase() === 'ended') {
                <span class="hunt-ended-label truncate">
                  · {{ 'lifecycle.ended' | transloco }}
                </span>
              }
              @if (deployLabel) {
                <span
                  class="shrink-0 text-[10px] font-bold uppercase tracking-wide text-muted border border-line rounded px-1 py-px"
                >
                  {{ deployLabel }}
                </span>
              }
            </span>
            <span class="flex items-center gap-3">
              @if (!sync.online()) {
                <span class="text-xs font-bold text-bad uppercase">
                  {{ 'common.offline' | transloco }}
                </span>
              } @else if (sync.pendingCount() > 0) {
                <span class="text-xs font-bold text-accent">⇅ {{ sync.pendingCount() }}</span>
              }
              <a routerLink="/hunt/profile" aria-label="Profile">
                <app-avatar [avatar]="session.user()?.avatar ?? 'fox'" [size]="36" />
              </a>
            </span>
          </header>
      }

      <div class="hunt-scroll-fade-top" aria-hidden="true"></div>

      <main class="hunt-main">
        @if (showInstallHint()) {
          <div
            class="hunt-install-hint bg-primary text-primary-ink text-sm px-4 py-2 flex items-center gap-2"
          >
            <span class="flex-1">{{ installHint() | transloco }}</span>
            @if (install.canPrompt()) {
              <button
                class="font-bold bg-primary-ink/20 rounded-lg px-3 py-1 shrink-0"
                (click)="installApp()"
              >
                {{ 'install.action' | transloco }}
              </button>
            }
            <button class="font-bold underline shrink-0 opacity-80" (click)="dismissInstall()">
              {{ 'install.dismiss' | transloco }}
            </button>
          </div>
        }

        @if (pack.eventPhase() === 'setup') {
          <div class="hunt-lifecycle-banner hunt-lifecycle-setup" role="status">
            <span class="text-4xl" aria-hidden="true">⏳</span>
            <p class="font-bold">{{ 'lifecycle.countdown' | transloco }}</p>
            <p class="text-2xl font-extrabold text-primary tabular-nums">{{ countdown() }}</p>
          </div>
        }
        <router-outlet />
      </main>

      <div class="hunt-scroll-fade" aria-hidden="true"></div>

      <div class="hunt-nav-dock">
        <nav class="hunt-nav" aria-label="Bottom navigation">
          <a routerLink="/hunt/codes" routerLinkActive="active" class="hunt-nav-tab">
            <app-hunt-nav-icon slot="codes" />
            <span class="lbl">{{ 'tabs.codes' | transloco }}</span>
          </a>
          <div class="hunt-scan-slot">
            <a
              routerLink="/hunt/scan"
              class="hunt-scan-fab"
              [class.pointer-events-none]="pack.eventPhase() !== 'live'"
              [class.opacity-40]="pack.eventPhase() !== 'live'"
              aria-label="Scan"
            >
              <app-hunt-nav-icon slot="scan" />
            </a>
          </div>
          <a routerLink="/hunt/ranking" routerLinkActive="active" class="hunt-nav-tab">
            <app-hunt-nav-icon slot="rank" />
            <span class="lbl">{{ 'tabs.ranking' | transloco }}</span>
          </a>
        </nav>
      </div>
    </div>
  `,
})
export class HuntShell {
  readonly deployLabel = environment.deployLabel;
  readonly pack = inject(PackStore);
  readonly session = inject(SessionStore);
  readonly sync = inject(SyncEngine);
  readonly install = inject(InstallPromptService);
  private readonly router = inject(Router);

  readonly isProfileRoute = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map(() => this.router.url.includes('/hunt/profile')),
      startWith(this.router.url.includes('/hunt/profile')),
    ),
    { initialValue: this.router.url.includes('/hunt/profile') },
  );

  private readonly installDismissed = signal(
    localStorage.getItem('qrhunt.installDismissed') === '1',
  );

  readonly showInstallHint = computed(
    () => !this.installDismissed() && !this.isStandalone(),
  );

  readonly installHint = computed(() =>
    this.install.canPrompt() ? 'install.hint' : 'install.hintManual',
  );

  readonly countdown = computed(() => {
    const event = this.pack.event();
    if (!event) return '';
    const ms = Math.max(0, Date.parse(event.startsAt) - this.pack.clock());
    const h = Math.floor(ms / 3600_000);
    const m = Math.floor((ms % 3600_000) / 60_000);
    const s = Math.floor((ms % 60_000) / 1000);
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  });

  dismissInstall(): void {
    localStorage.setItem('qrhunt.installDismissed', '1');
    this.installDismissed.set(true);
  }

  async installApp(): Promise<void> {
    const accepted = await this.install.prompt();
    if (accepted) this.dismissInstall();
  }

  private isStandalone(): boolean {
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true
    );
  }
}
