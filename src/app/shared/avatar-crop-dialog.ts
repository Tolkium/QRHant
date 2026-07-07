import { Component, input, output, signal } from '@angular/core';
import { TranslocoModule } from '@jsverse/transloco';
import { cropSquareAvatar } from './image-utils';

const CROP_SIZE = 280;
const MAX_ZOOM = 3;

@Component({
  selector: 'app-avatar-crop-dialog',
  imports: [TranslocoModule],
  template: `
    <div
      class="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
      (click)="cancelled.emit()"
    >
      <div
        class="card p-4 w-full max-w-sm flex flex-col gap-4"
        (click)="$event.stopPropagation()"
      >
        <div>
          <p class="font-bold text-lg">{{ 'profile.avatarCrop.title' | transloco }}</p>
          <p class="text-sm text-muted">{{ 'profile.avatarCrop.hint' | transloco }}</p>
        </div>

        <div
          class="relative mx-auto overflow-hidden rounded-full bg-black touch-none select-none ring-2 ring-white/80"
          [style.width.px]="cropSize"
          [style.height.px]="cropSize"
          (pointerdown)="onPointerDown($event)"
          (pointermove)="onPointerMove($event)"
          (pointerup)="onPointerUp($event)"
          (pointercancel)="onPointerUp($event)"
          (wheel)="onWheel($event)"
        >
          @if (ready()) {
            <img
              [src]="imageSrc()"
              alt=""
              draggable="false"
              class="absolute max-w-none pointer-events-none"
              [style.width.px]="displayW()"
              [style.height.px]="displayH()"
              [style.left.px]="offsetX()"
              [style.top.px]="offsetY()"
            />
          }

          <div class="absolute inset-0 pointer-events-none">
            <div class="absolute left-1/3 top-0 bottom-0 w-px bg-white/45"></div>
            <div class="absolute left-2/3 top-0 bottom-0 w-px bg-white/45"></div>
            <div class="absolute top-1/3 left-0 right-0 h-px bg-white/45"></div>
            <div class="absolute top-2/3 left-0 right-0 h-px bg-white/45"></div>
          </div>
        </div>

        <div class="flex gap-2">
          <button type="button" class="btn-ghost flex-1" (click)="cancelled.emit()">
            {{ 'common.cancel' | transloco }}
          </button>
          <button
            type="button"
            class="btn-primary flex-1"
            [disabled]="!ready() || saving()"
            (click)="confirm()"
          >
            {{ saving() ? '…' : ('profile.avatarCrop.save' | transloco) }}
          </button>
        </div>
      </div>
    </div>
  `,
})
export class AvatarCropDialog {
  readonly imageSrc = input.required<string>();
  readonly file = input.required<File>();
  readonly confirmed = output<string>();
  readonly cancelled = output<void>();

  readonly cropSize = CROP_SIZE;
  readonly ready = signal(false);
  readonly saving = signal(false);
  readonly scale = signal(1);
  readonly minScale = signal(1);
  readonly maxScale = signal(MAX_ZOOM);
  readonly offsetX = signal(0);
  readonly offsetY = signal(0);

  private naturalW = 0;
  private naturalH = 0;
  private dragging = false;
  private dragStartX = 0;
  private dragStartY = 0;
  private dragOriginX = 0;
  private dragOriginY = 0;
  private pinching = false;
  private pinchStartDist = 0;
  private pinchStartScale = 0;
  private readonly pointers = new Map<number, { x: number; y: number }>();

  constructor() {
    queueMicrotask(() => this.loadImage());
  }

  displayW(): number {
    return this.naturalW * this.scale();
  }

  displayH(): number {
    return this.naturalH * this.scale();
  }

  onPointerDown(event: PointerEvent): void {
    if (!this.ready()) return;
    const el = event.currentTarget as HTMLElement;
    el.setPointerCapture(event.pointerId);
    this.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (this.pointers.size === 2) {
      this.beginPinch();
      return;
    }

    this.dragging = true;
    this.dragStartX = event.clientX;
    this.dragStartY = event.clientY;
    this.dragOriginX = this.offsetX();
    this.dragOriginY = this.offsetY();
  }

  onPointerMove(event: PointerEvent): void {
    if (!this.pointers.has(event.pointerId)) return;
    this.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (this.pinching && this.pointers.size >= 2) {
      const dist = this.pointerDistance();
      if (dist > 0 && this.pinchStartDist > 0) {
        this.setScale(this.pinchStartScale * (dist / this.pinchStartDist));
      }
      return;
    }

    if (!this.dragging || this.pointers.size !== 1) return;
    const dx = event.clientX - this.dragStartX;
    const dy = event.clientY - this.dragStartY;
    this.offsetX.set(this.dragOriginX + dx);
    this.offsetY.set(this.dragOriginY + dy);
    this.clampOffsets();
  }

  onPointerUp(event: PointerEvent): void {
    this.pointers.delete(event.pointerId);
    if (this.pointers.size < 2) this.pinching = false;
    if (this.pointers.size === 0) {
      this.dragging = false;
    } else if (this.pointers.size === 1 && !this.pinching) {
      const [pt] = this.pointers.values();
      this.dragging = true;
      this.dragStartX = pt.x;
      this.dragStartY = pt.y;
      this.dragOriginX = this.offsetX();
      this.dragOriginY = this.offsetY();
    }
    try {
      (event.currentTarget as HTMLElement).releasePointerCapture(event.pointerId);
    } catch {
      /* pointer may already be released */
    }
  }

  onWheel(event: WheelEvent): void {
    event.preventDefault();
    const delta = event.deltaY > 0 ? -0.08 : 0.08;
    this.setScale(this.scale() + delta);
  }

  async confirm(): Promise<void> {
    if (!this.ready() || this.saving()) return;
    this.saving.set(true);
    try {
      const dataUrl = await cropSquareAvatar(
        this.file(),
        this.offsetX(),
        this.offsetY(),
        this.scale(),
        this.cropSize,
      );
      this.confirmed.emit(dataUrl);
    } finally {
      this.saving.set(false);
    }
  }

  private beginPinch(): void {
    this.pinching = true;
    this.dragging = false;
    this.pinchStartDist = this.pointerDistance();
    this.pinchStartScale = this.scale();
  }

  private pointerDistance(): number {
    const pts = [...this.pointers.values()];
    if (pts.length < 2) return 0;
    const dx = pts[1].x - pts[0].x;
    const dy = pts[1].y - pts[0].y;
    return Math.hypot(dx, dy);
  }

  private loadImage(): void {
    const img = new Image();
    img.onload = () => {
      this.naturalW = img.naturalWidth;
      this.naturalH = img.naturalHeight;
      const cover = Math.max(this.cropSize / this.naturalW, this.cropSize / this.naturalH);
      this.minScale.set(cover);
      this.maxScale.set(cover * MAX_ZOOM);
      this.scale.set(cover);
      this.centerImage();
      this.ready.set(true);
    };
    img.src = this.imageSrc();
  }

  private setScale(next: number): void {
    const clamped = Math.min(this.maxScale(), Math.max(this.minScale(), next));
    const prev = this.scale();
    if (clamped === prev) return;

    const cx = this.cropSize / 2;
    const cy = this.cropSize / 2;
    const ratio = clamped / prev;
    this.offsetX.set(cx - (cx - this.offsetX()) * ratio);
    this.offsetY.set(cy - (cy - this.offsetY()) * ratio);
    this.scale.set(clamped);
    this.clampOffsets();
  }

  private centerImage(): void {
    this.offsetX.set((this.cropSize - this.displayW()) / 2);
    this.offsetY.set((this.cropSize - this.displayH()) / 2);
    this.clampOffsets();
  }

  private clampOffsets(): void {
    const w = this.displayW();
    const h = this.displayH();
    const minX = this.cropSize - w;
    const minY = this.cropSize - h;
    this.offsetX.set(Math.min(0, Math.max(minX, this.offsetX())));
    this.offsetY.set(Math.min(0, Math.max(minY, this.offsetY())));
  }
}
