import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { SessionStore } from '../../../core/stores/session.store';
import { PackStore } from '../../../core/stores/pack.store';
import { SyncEngine } from '../../../core/sync/sync-engine';
import { InstallPromptService } from '../../../core/pwa/install-prompt';
import { CodeEntryService } from '../scan/code-entry.service';
import { Avatar } from '../../../shared/avatar';
import { AvatarCropDialog } from '../../../shared/avatar-crop-dialog';
import { Lang, LANGS, PRESET_AVATARS, isCustomAvatar } from '../../../core/models';
import { environment } from '../../../../environments/environment';
import { celebrateFind } from '../../../shared/celebrate';

@Component({
  selector: 'app-profile-page',
  imports: [FormsModule, RouterLink, TranslocoModule, Avatar, AvatarCropDialog],
  template: `
    <div class="p-4 max-w-md mx-auto flex flex-col gap-4">
      <a routerLink="/hunt/codes" class="text-primary font-semibold">
        ← {{ 'common.back' | transloco }}
      </a>
      <h1 class="text-2xl font-extrabold">{{ 'profile.title' | transloco }}</h1>

      <!-- identity -->
      <section class="card p-4 flex items-center gap-4">
        <app-avatar [avatar]="session.user()?.avatar ?? 'fox'" [size]="56" />
        <div>
          <p class="font-bold text-lg">{{ session.user()?.nickname }}</p>
          <p class="text-sm text-muted">{{ 'profile.nickname' | transloco }}</p>
        </div>
      </section>

      <!-- avatar picker -->
      <section class="card p-4">
        <p class="label">{{ 'profile.avatar' | transloco }}</p>
        <div class="flex flex-wrap gap-2">
          @for (a of avatars; track a) {
            <button
              class="rounded-full p-1 border-2"
              [class.border-primary]="session.user()?.avatar === a"
              [class.border-transparent]="session.user()?.avatar !== a"
              (click)="setAvatar(a)"
            >
              <app-avatar [avatar]="a" [size]="44" />
            </button>
          }
          <label
            class="rounded-full p-1 border-2 cursor-pointer shrink-0"
            [class.border-primary]="hasCustomAvatar()"
            [class.border-transparent]="!hasCustomAvatar()"
            [class.!border-dashed]="!hasCustomAvatar()"
            [class.!border-line]="!hasCustomAvatar()"
            [attr.aria-label]="'profile.avatarUpload.label' | transloco"
          >
            @if (hasCustomAvatar()) {
              <app-avatar [avatar]="session.user()!.avatar" [size]="44" />
            } @else {
              <span
                class="flex flex-col items-center justify-center rounded-full bg-primary/10 text-primary leading-none"
                style="width: 44px; height: 44px"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  class="w-5 h-5"
                  aria-hidden="true"
                >
                  <path d="M12 5v14M5 12h14" />
                </svg>
                <span class="text-[9px] font-bold mt-0.5">{{
                  'profile.avatarUpload.short' | transloco
                }}</span>
              </span>
            }
            <input
              type="file"
              accept="image/*"
              class="hidden"
              (change)="pickAvatar($event)"
            />
          </label>
        </div>
      </section>

      @if (cropFile(); as file) {
        <app-avatar-crop-dialog
          [imageSrc]="cropPreview()!"
          [file]="file"
          (confirmed)="onAvatarCropped($event)"
          (cancelled)="clearCrop()"
        />
      }

      <!-- language -->
      <section class="card p-4">
        <p class="label">{{ 'profile.language' | transloco }}</p>
        <div class="flex gap-2">
          @for (lang of langs; track lang) {
            <button
              class="btn-ghost flex-1"
              [class.!bg-primary]="activeLang() === lang"
              [class.!text-primary-ink]="activeLang() === lang"
              (click)="setLang(lang)"
            >
              {{ lang.toUpperCase() }}
            </button>
          }
        </div>
      </section>

      <!-- sync -->
      <section class="card p-4 flex flex-col gap-2">
        <p class="label">{{ 'profile.sync.title' | transloco }}</p>
        @if (sync.pendingCount() > 0) {
          <p class="font-semibold text-accent">
            {{ 'profile.sync.pending' | transloco: { count: sync.pendingCount() } }}
          </p>
        } @else {
          <p class="font-semibold text-good">{{ 'profile.sync.done' | transloco }}</p>
        }
        <p class="text-sm text-muted">
          @if (sync.lastSyncAt(); as t) {
            {{ 'profile.sync.last' | transloco: { time: formatTime(t) } }}
          } @else {
            {{ 'profile.sync.never' | transloco }}
          }
        </p>
        <button class="btn-ghost" (click)="syncNow()">
          {{ 'profile.sync.now' | transloco }}
        </button>
      </section>

      <!-- install app (hidden when already on home screen) -->
      @if (!isStandalone()) {
        <section class="card p-4 flex flex-col gap-2">
          <p class="label">{{ 'profile.install.title' | transloco }}</p>
          <p class="text-sm text-muted">{{ installHint() | transloco }}</p>
          @if (install.canPrompt()) {
            <button class="btn-primary w-full" (click)="installApp()">
              {{ 'install.action' | transloco }}
            </button>
          }
        </section>
      }

      <!-- staff manual entry: only rendered when the admin flag is on -->
      @if (pack.event()?.huntSettings?.manualEntryEnabled) {
        <section class="card p-4 flex flex-col gap-2 border-2 !border-accent">
          <p class="label">{{ 'scan.manual.title' | transloco }}</p>
          <form class="flex gap-2" (ngSubmit)="submitManual()">
            <input
              class="input flex-1 uppercase tracking-widest"
              [(ngModel)]="manualCode"
              name="manualCode"
              maxlength="6"
              [placeholder]="'scan.manual.placeholder' | transloco"
            />
            <button class="btn-primary" type="submit">
              {{ 'scan.manual.submit' | transloco }}
            </button>
          </form>
          @if (manualResult()) {
            <p class="text-sm font-semibold">{{ manualResult()! | transloco }}</p>
          }
        </section>
      }

      <!-- rules replay -->
      <button class="btn-ghost" (click)="showRules.set(!showRules())">
        {{ 'profile.rules' | transloco }}
      </button>
      @if (showRules()) {
        <section class="card p-4 flex flex-col gap-4">
          @for (key of ['one', 'two', 'three']; track key; let i = $index) {
            <div class="flex gap-3 items-start">
              <span class="text-3xl">{{ ['🔍', '🎨', '🏆'][i] }}</span>
              <div>
                <p class="font-bold">{{ 'onboarding.slides.' + key + '.title' | transloco }}</p>
                <p class="text-sm text-muted">
                  {{ 'onboarding.slides.' + key + '.text' | transloco }}
                </p>
              </div>
            </div>
          }
        </section>
      }

      <button class="btn-danger" (click)="logout()">{{ 'profile.logout' | transloco }}</button>

      <p class="text-center text-xs text-muted">
        {{ 'profile.version' | transloco }} {{ version }}
      </p>
    </div>
  `,
})
export class ProfilePage {
  readonly session = inject(SessionStore);
  readonly pack = inject(PackStore);
  readonly sync = inject(SyncEngine);
  readonly install = inject(InstallPromptService);
  private readonly entry = inject(CodeEntryService);
  private readonly transloco = inject(TranslocoService);
  private readonly router = inject(Router);

  readonly langs = LANGS;
  readonly avatars = PRESET_AVATARS;
  readonly version = environment.appVersion;
  readonly manualResult = signal<string | null>(null);
  readonly showRules = signal(false);
  readonly cropFile = signal<File | null>(null);
  readonly cropPreview = signal<string | null>(null);
  readonly hasCustomAvatar = computed(() => {
    const av = this.session.user()?.avatar;
    return !!av && isCustomAvatar(av);
  });

  readonly isStandalone = () =>
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;

  readonly installHint = () =>
    this.install.canPrompt() ? 'install.hint' : 'install.hintManual';

  manualCode = '';

  activeLang(): string {
    return this.transloco.getActiveLang();
  }

  setLang(lang: Lang): void {
    void this.session.setLanguage(lang);
  }

  setAvatar(avatar: string): void {
    void this.session.setAvatar(avatar);
  }

  pickAvatar(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file || !file.type.startsWith('image/')) return;
    if (file.size > 12 * 1024 * 1024) {
      this.manualResult.set('profile.avatarUpload.tooLarge');
      setTimeout(() => this.manualResult.set(null), 3000);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      this.cropPreview.set(reader.result as string);
      this.cropFile.set(file);
    };
    reader.readAsDataURL(file);
  }

  onAvatarCropped(dataUrl: string): void {
    this.clearCrop();
    void this.session.setAvatar(dataUrl);
  }

  clearCrop(): void {
    this.cropFile.set(null);
    this.cropPreview.set(null);
  }

  syncNow(): void {
    void this.sync.trigger();
  }

  async installApp(): Promise<void> {
    await this.install.prompt();
  }

  formatTime(iso: string): string {
    return new Date(iso).toLocaleString();
  }

  async submitManual(): Promise<void> {
    const result = await this.entry.submit(this.manualCode);
    this.manualCode = '';
    switch (result.kind) {
      case 'found':
        celebrateFind();
        this.manualResult.set('celebrate.found');
        break;
      case 'already-found':
        this.manualResult.set('scan.alreadyFound');
        break;
      default:
        this.manualResult.set('scan.unknownCode');
    }
    setTimeout(() => this.manualResult.set(null), 3000);
  }

  async logout(): Promise<void> {
    await this.session.logout();
    await this.router.navigate(['/auth']);
  }
}
