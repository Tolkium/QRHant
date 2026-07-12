import { Component, computed, input, output, signal } from '@angular/core';
import { TranslocoModule } from '@jsverse/transloco';
import { QrImage } from './qr-image';
import { ImageCropPreview } from './image-crop-preview';
import {
  AVATAR_EXPORT_SIZE,
  CARD_ART,
  CARD_ART_ASPECT_CSS,
  clampCropOffset,
  coverMinScale,
  cropFrameHeight,
  CROP_FRAME_WIDTH,
} from './image-dimensions';
import { cropCardArtImage, cropSquareAvatar } from './image-utils';

const MAX_ZOOM = 3;

export type ImageCropVariant = 'avatar' | 'card';

@Component({
  selector: 'app-image-crop-dialog',
  imports: [TranslocoModule, QrImage, ImageCropPreview],
  template: `
    <div
      class="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
      (click)="cancelled.emit()"
    >
      <div
        class="card p-4 w-full max-w-lg flex flex-col gap-4 max-h-[95vh] overflow-y-auto"
        (click)="$event.stopPropagation()"
      >
        <div>
          @if (variant() === 'avatar') {
            <p class="font-bold text-lg">{{ 'profile.avatarCrop.title' | transloco }}</p>
            <p class="text-sm text-muted">{{ 'profile.avatarCrop.hint' | transloco }}</p>
          } @else {
            <p class="font-bold text-lg">{{ 'admin.cardCrop.title' | transloco }}</p>
            <p class="text-sm text-muted">{{ 'admin.cardCrop.hint' | transloco }}</p>
          }
        </div>

        <div class="flex flex-col sm:flex-row items-center justify-center gap-4">
          <div
            class="relative overflow-hidden bg-black touch-none select-none shrink-0 ring-2 ring-white/80"
            [class.rounded-full]="variant() === 'avatar'"
            [class.rounded-xl]="variant() === 'card'"
            [style.width.px]="cropW()"
            [style.height.px]="cropH()"
            (pointerdown)="onPointerDown($event)"
            (pointermove)="onPointerMove($event)"
            (pointerup)="onPointerUp($event)"
            (pointercancel)="onPointerUp($event)"
            (wheel)="onWheel($event)"
          >
            @if (ready()) {
              <app-image-crop-preview
                [imageSrc]="imageSrc()"
                [cropW]="cropW()"
                [cropH]="cropH()"
                [displayW]="displayW()"
                [displayH]="displayH()"
                [offsetX]="offsetX()"
                [offsetY]="offsetY()"
                [rotation]="rotation()"
              />
            }

            <div class="absolute inset-0 pointer-events-none">
              <div class="absolute left-1/3 top-0 bottom-0 w-px bg-white/45"></div>
              <div class="absolute left-2/3 top-0 bottom-0 w-px bg-white/45"></div>
              <div class="absolute top-1/3 left-0 right-0 h-px bg-white/45"></div>
              <div class="absolute top-2/3 left-0 right-0 h-px bg-white/45"></div>
            </div>
          </div>

          @if (variant() === 'avatar') {
            <div class="flex flex-col items-center gap-1 shrink-0">
              <p class="text-xs text-muted">{{ 'profile.avatarCrop.preview' | transloco }}</p>
              <div
                class="rounded-full overflow-hidden bg-black ring-2 ring-line"
                [style.width.px]="previewAvatarSize"
                [style.height.px]="previewAvatarSize"
              >
                @if (ready()) {
                  <app-image-crop-preview
                    [imageSrc]="imageSrc()"
                    [cropW]="cropW()"
                    [cropH]="cropH()"
                    [displayW]="displayW()"
                    [displayH]="displayH()"
                    [offsetX]="offsetX()"
                    [offsetY]="offsetY()"
                    [rotation]="rotation()"
                    [previewScale]="previewScale()"
                    [positioned]="true"
                  />
                }
              </div>
            </div>
          } @else {
            <div class="flex flex-col items-center gap-1 shrink-0">
              <p class="text-xs text-muted">{{ 'admin.cardCrop.preview' | transloco }}</p>
              <div
                class="border-2 border-dashed border-line rounded-lg overflow-hidden bg-white"
                [style.width.px]="previewCardWidth"
              >
                <div class="relative overflow-hidden bg-black" [style.aspect-ratio]="cardArtAspect">
                  @if (ready()) {
                    <app-image-crop-preview
                      [imageSrc]="imageSrc()"
                      [cropW]="cropW()"
                      [cropH]="cropH()"
                      [displayW]="displayW()"
                      [displayH]="displayH()"
                      [offsetX]="offsetX()"
                      [offsetY]="offsetY()"
                      [rotation]="rotation()"
                      [previewScale]="previewScale()"
                      [positioned]="true"
                    />
                  }
                </div>
                <div
                  class="flex items-center justify-center border-t border-dashed border-line bg-white p-1"
                  [style.aspect-ratio]="'1'"
                >
                  <app-qr-image [code]="code()" [size]="previewQrSize" class="block w-full h-full" />
                </div>
              </div>
            </div>
          }
        </div>

        <div>
          <label class="label flex justify-between gap-2">
            <span>{{
              variant() === 'avatar'
                ? ('profile.avatarCrop.rotation' | transloco)
                : ('admin.cardCrop.rotation' | transloco)
            }}</span>
            <span class="text-muted font-normal">{{ rotation() }}°</span>
          </label>
          <input
            type="range"
            class="w-full accent-primary"
            min="-180"
            max="180"
            step="1"
            [value]="rotation()"
            (input)="onRotationInput($event)"
          />
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
            @if (saving()) {
              …
            } @else if (variant() === 'avatar') {
              {{ 'profile.avatarCrop.save' | transloco }}
            } @else {
              {{ 'admin.cardCrop.save' | transloco }}
            }
          </button>
        </div>
      </div>
    </div>
  `,
  styles: `
    :host ::ng-deep app-qr-image img {
      width: 100% !important;
      height: 100% !important;
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
      border-radius: 0;
    }
  `,
})
export class ImageCropDialog {
  readonly imageSrc = input.required<string>();
  readonly file = input.required<File>();
  readonly variant = input<ImageCropVariant>('avatar');
  readonly code = input('');
  readonly confirmed = output<string>();
  readonly cancelled = output<void>();

  readonly previewAvatarSize = 88;
  readonly previewCardWidth = 132;
  readonly previewQrSize = 256;
  readonly cardArtAspect = CARD_ART_ASPECT_CSS;

  readonly ready = signal(false);
  readonly saving = signal(false);
  readonly scale = signal(1);
  readonly minScale = signal(1);
  readonly maxScale = signal(MAX_ZOOM);
  readonly offsetX = signal(0);
  readonly offsetY = signal(0);
  readonly rotation = signal(0);

  readonly cropW = computed(() => CROP_FRAME_WIDTH);
  readonly cropH = computed(() => cropFrameHeight(this.variant()));

  readonly previewScale = computed(() => {
    const target = this.variant() === 'avatar' ? this.previewAvatarSize : this.previewCardWidth;
    return target / this.cropW();
  });

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

  onRotationInput(event: Event): void {
    this.rotation.set(Number((event.target as HTMLInputElement).value));
    this.updateMinScale();
    this.clampOffsets();
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
      const dataUrl =
        this.variant() === 'avatar'
          ? await cropSquareAvatar(
              this.file(),
              this.offsetX(),
              this.offsetY(),
              this.scale(),
              this.cropW(),
              this.rotation(),
              AVATAR_EXPORT_SIZE,
            )
          : await cropCardArtImage(
              this.file(),
              this.cropW(),
              this.cropH(),
              this.offsetX(),
              this.offsetY(),
              this.scale(),
              this.rotation(),
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
      this.updateMinScale();
      this.maxScale.set(this.minScale() * MAX_ZOOM);
      this.scale.set(this.minScale());
      this.centerImage();
      this.ready.set(true);
    };
    img.src = this.imageSrc();
  }

  private updateMinScale(): void {
    const cover = coverMinScale(
      this.naturalW,
      this.naturalH,
      this.cropW(),
      this.cropH(),
      this.rotation(),
    );
    this.minScale.set(cover);
    if (this.scale() < cover) this.setScale(cover);
    this.maxScale.set(Math.max(this.maxScale(), cover * MAX_ZOOM));
  }

  private setScale(next: number): void {
    const clamped = Math.min(this.maxScale(), Math.max(this.minScale(), next));
    const prev = this.scale();
    if (clamped === prev) return;

    const cx = this.cropW() / 2;
    const cy = this.cropH() / 2;
    const ratio = clamped / prev;
    this.offsetX.set(cx - (cx - this.offsetX()) * ratio);
    this.offsetY.set(cy - (cy - this.offsetY()) * ratio);
    this.scale.set(clamped);
    this.clampOffsets();
  }

  private centerImage(): void {
    this.offsetX.set((this.cropW() - this.displayW()) / 2);
    this.offsetY.set((this.cropH() - this.displayH()) / 2);
    this.clampOffsets();
  }

  private clampOffsets(): void {
    if (Math.abs(this.rotation()) > 0.5) return;
    this.offsetX.set(clampCropOffset(this.offsetX(), this.displayW(), this.cropW()));
    this.offsetY.set(clampCropOffset(this.offsetY(), this.displayH(), this.cropH()));
  }
}
