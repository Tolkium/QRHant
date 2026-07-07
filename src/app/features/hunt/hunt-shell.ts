import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { TranslocoModule } from '@jsverse/transloco';
import { PackStore } from '../../core/stores/pack.store';
import { SessionStore } from '../../core/stores/session.store';
import { SyncEngine } from '../../core/sync/sync-engine';
import { InstallPromptService } from '../../core/pwa/install-prompt';
import { Avatar } from '../../shared/avatar';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-hunt-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, TranslocoModule, Avatar],
  template: `
    <div class="min-h-dvh flex flex-col">
      <!-- top bar -->
      <header
        class="sticky top-0 z-10 flex items-center justify-between px-4 py-2 bg-surface border-b border-line"
      >
        <span class="font-extrabold text-lg truncate flex items-center gap-1.5 min-w-0">
          <span class="truncate">{{ pack.event()?.theme?.logoText ?? 'QR Hunt' }}</span>
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

      @if (showInstallHint()) {
        <div class="bg-primary text-primary-ink text-sm px-4 py-2 flex items-center gap-2">
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

      <main class="flex-1 pb-24">
        @switch (pack.eventPhase()) {
          @case ('setup') {
            <div class="flex flex-col items-center justify-center gap-4 p-8 text-center mt-16">
              <div class="text-6xl">⏳</div>
              <h2 class="text-2xl font-bold">{{ 'lifecycle.countdown' | transloco }}</h2>
              <p class="text-4xl font-extrabold text-primary tabular-nums">{{ countdown() }}</p>
            </div>
          }
          @case ('ended') {
            <div class="flex flex-col items-center gap-4 p-8 text-center mt-8">
              <div class="text-6xl">🏁</div>
              <h2 class="text-2xl font-bold">{{ 'lifecycle.ended' | transloco }}</h2>
              <p class="text-muted">{{ 'lifecycle.thanks' | transloco }}</p>
              <a routerLink="/hunt/ranking" class="btn-primary">{{ 'rank.title' | transloco }}</a>
            </div>
          }
          @default {
            <router-outlet />
          }
        }
      </main>

      <!-- bottom bar: Codes | SCAN | Ranking -->
      <nav
        class="fixed bottom-0 inset-x-0 z-10 bg-surface border-t border-line
          grid grid-cols-3 items-end pb-[env(safe-area-inset-bottom)]"
      >
        <a
          routerLink="/hunt/codes"
          routerLinkActive="!text-primary"
          class="flex flex-col items-center gap-0.5 py-2 text-muted font-semibold text-xs"
        >
          <span class="text-2xl leading-none">🃏</span>
          {{ 'tabs.codes' | transloco }}
        </a>
        <div class="flex justify-center">
          <a
            routerLink="/hunt/scan"
            class="!rounded-full w-16 h-16 -mt-6 bg-primary text-primary-ink shadow-lg
              ring-4 ring-page flex items-center justify-center active:scale-95 transition-transform"
            [class.pointer-events-none]="pack.eventPhase() !== 'live'"
            [class.opacity-40]="pack.eventPhase() !== 'live'"
            aria-label="Scan"
          >
            <!-- QR scan icon: viewfinder corners + center line -->
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M3 7V5a2 2 0 0 1 2-2h2" />
              <path d="M17 3h2a2 2 0 0 1 2 2v2" />
              <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
              <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
              <line x1="7" y1="12" x2="17" y2="12" />
            </svg>
          </a>
        </div>
        <a
          routerLink="/hunt/ranking"
          routerLinkActive="!text-primary"
          class="flex flex-col items-center gap-0.5 py-2 text-muted font-semibold text-xs"
        >
          <span class="text-2xl leading-none">🏆</span>
          {{ 'tabs.ranking' | transloco }}
        </a>
      </nav>
    </div>
  `,
})
export class HuntShell {
  readonly deployLabel = environment.deployLabel;
  readonly pack = inject(PackStore);
  readonly session = inject(SessionStore);
  readonly sync = inject(SyncEngine);
  readonly install = inject(InstallPromptService);

  private readonly now = signal(Date.now());
  private readonly installDismissed = signal(
    localStorage.getItem('qrhunt.installDismissed') === '1',
  );

  /** Shown in browser tab only — standalone / home-screen has no URL bar. */
  readonly showInstallHint = computed(
    () => !this.installDismissed() && !this.isStandalone(),
  );

  /** Native install button vs manual iOS steps. */
  readonly installHint = computed(() =>
    this.install.canPrompt() ? 'install.hint' : 'install.hintManual',
  );

  readonly countdown = computed(() => {
    const event = this.pack.event();
    if (!event) return '';
    const ms = Math.max(0, Date.parse(event.startsAt) - this.now());
    const h = Math.floor(ms / 3600_000);
    const m = Math.floor((ms % 3600_000) / 60_000);
    const s = Math.floor((ms % 60_000) / 1000);
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  });

  constructor() {
    setInterval(() => this.now.set(Date.now()), 1000);
  }

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
