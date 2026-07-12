import {
  AfterViewInit,
  Component,
  ElementRef,
  inject,
  OnDestroy,
  signal,
  viewChild,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { TranslocoModule } from '@jsverse/transloco';
import { PackStore } from '../../../core/stores/pack.store';
import { ScannerService } from './scanner.service';
import { CodeEntryService } from './code-entry.service';
import { celebrateFind, celebrateMilestone } from '../../../shared/celebrate';

@Component({
  selector: 'app-scan-page',
  imports: [RouterLink, TranslocoModule],
  template: `
    <div class="fixed inset-0 bg-black flex flex-col">
      <header class="flex items-center justify-between p-4 text-white z-10">
        <a routerLink="/hunt/codes" class="text-2xl px-2" aria-label="Close">✕</a>
        <h1 class="font-bold">{{ 'scan.title' | transloco }}</h1>
        <span class="w-10"></span>
      </header>

      <div class="relative flex-1 overflow-hidden">
        <video #video class="absolute inset-0 w-full h-full object-cover" playsinline muted></video>

        <!-- viewfinder -->
        <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div
            class="w-64 h-64 rounded-3xl border-4"
            [class.border-white]="!paused()"
            [class.border-white]="!flash()"
            [class.border-good]="flash() === 'good'"
            [class.border-bad]="flash() === 'bad'"
          ></div>
        </div>

        @if (paused()) {
          <div class="absolute inset-0 bg-black/80 flex items-center justify-center">
            <span class="text-white text-6xl">⏸</span>
          </div>
        }
        @if (cameraError()) {
          <div class="absolute inset-0 bg-black/90 flex items-center justify-center p-8">
            <p class="text-white text-center">{{ 'scan.noCamera' | transloco }}</p>
          </div>
        }
        @if (toast()) {
          <div class="absolute bottom-6 inset-x-6 z-10">
            <p
              class="rounded-xl px-4 py-3 text-center font-semibold text-white"
              [class.bg-bad]="toastKind() === 'bad'"
              [class.bg-black]="toastKind() === 'info'"
            >
              {{ toast()! | transloco }}
            </p>
          </div>
        }
      </div>

      <footer class="p-4 pb-[max(1rem,env(safe-area-inset-bottom))] z-10 flex flex-col gap-2">
        <p class="text-white/70 text-center text-sm">{{ 'scan.hint' | transloco }}</p>
        <button class="btn-ghost w-full" (click)="togglePause()">
          {{ (paused() ? 'scan.resume' : 'scan.pause') | transloco }}
        </button>
      </footer>
    </div>
  `,
})
export class ScanPage implements AfterViewInit, OnDestroy {
  private readonly scanner = inject(ScannerService);
  private readonly entry = inject(CodeEntryService);
  private readonly pack = inject(PackStore);
  private readonly router = inject(Router);

  private readonly videoRef = viewChild.required<ElementRef<HTMLVideoElement>>('video');

  readonly paused = signal(false);
  readonly cameraError = signal(false);
  readonly toast = signal<string | null>(null);
  readonly toastKind = signal<'bad' | 'info'>('info');
  readonly flash = signal<'good' | 'bad' | null>(null);

  private lastValue = '';
  private lastValueAt = 0;
  private matching = false;
  private toastTimer: ReturnType<typeof setTimeout> | null = null;

  private nativeActive = false;

  async ngAfterViewInit(): Promise<void> {
    if (this.pack.eventPhase() !== 'live') {
      await this.router.navigate(['/hunt/codes']);
      return;
    }
    await this.startCamera();
  }

  private async startCamera(): Promise<void> {
    try {
      this.cameraError.set(false);
      if (this.scanner.isNative()) {
        // Android APK: MLKit native scanning, one shot at a time in a loop
        this.nativeActive = true;
        while (this.nativeActive && !this.paused()) {
          const raw = await this.scanner.scanOnceNative();
          if (raw === null) break; // user cancelled the native view
          await this.onDecode(raw);
        }
      } else {
        await this.scanner.start(this.videoRef().nativeElement, (raw) => void this.onDecode(raw));
      }
    } catch {
      this.cameraError.set(true);
    }
  }

  /** Pause/start toggle: camera is fully off while paused (battery, privacy). */
  async togglePause(): Promise<void> {
    if (this.paused()) {
      this.paused.set(false);
      await this.startCamera();
    } else {
      this.paused.set(true);
      this.nativeActive = false;
      this.scanner.stop(this.videoRef().nativeElement);
    }
  }

  private async onDecode(raw: string): Promise<void> {
    const now = Date.now();
    // cooldown: ignore the same physical QR re-detected within 3s
    if (this.matching || (raw === this.lastValue && now - this.lastValueAt < 3000)) return;
    this.lastValue = raw;
    this.lastValueAt = now;

    this.matching = true;
    try {
      const result = await this.entry.submit(raw);
      switch (result.kind) {
        case 'not-a-code':
          // foreign QR (someone's Instagram) — stay silent, keep scanning
          break;
        case 'unknown':
          this.flashNow('bad');
          this.showToast('scan.unknownCode', 'bad');
          break;
        case 'already-found':
          this.flashNow('good');
          this.showToast('scan.alreadyFound', 'info');
          break;
        case 'not-live':
          this.showToast('lifecycle.ended', 'info');
          await this.router.navigate(['/hunt/codes']);
          break;
        case 'found': {
          this.flashNow('good');
          this.scanner.stop(this.videoRef().nativeElement);
          if (result.all || result.milestone) celebrateMilestone();
          else celebrateFind();
          await this.router.navigate(['/hunt/codes', result.find.codeId]);
          break;
        }
      }
    } finally {
      this.matching = false;
    }
  }

  private flashNow(kind: 'good' | 'bad'): void {
    this.flash.set(kind);
    setTimeout(() => this.flash.set(null), 700);
  }

  private showToast(key: string, kind: 'bad' | 'info'): void {
    this.toast.set(key);
    this.toastKind.set(kind);
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => this.toast.set(null), 2500);
  }

  ngOnDestroy(): void {
    this.nativeActive = false;
    this.scanner.stop(this.videoRef().nativeElement);
  }
}
