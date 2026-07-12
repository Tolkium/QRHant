import { Component, computed, input } from '@angular/core';

/** Renders the panned / zoomed / rotated image layer inside a crop frame. */
@Component({
  selector: 'app-image-crop-preview',
  template: `
    <div
      class="relative overflow-hidden"
      [class.absolute]="positioned()"
      [class.top-0]="positioned()"
      [class.left-0]="positioned()"
      [style.width.px]="frameW()"
      [style.height.px]="frameH()"
      [style.transform]="wrapperTransform()"
      style="transform-origin: top left"
    >
      <div
        class="absolute inset-0"
        [style.transform]="'rotate(' + rotation() + 'deg)'"
        style="transform-origin: center center"
      >
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
      </div>
    </div>
  `,
})
export class ImageCropPreview {
  readonly imageSrc = input.required<string>();
  readonly cropW = input.required<number>();
  readonly cropH = input.required<number>();
  readonly displayW = input.required<number>();
  readonly displayH = input.required<number>();
  readonly offsetX = input.required<number>();
  readonly offsetY = input.required<number>();
  readonly rotation = input.required<number>();
  /** Scale down the whole frame for side previews (1 = full size). */
  readonly previewScale = input(1);
  /** When true, uses absolute positioning for scaled previews inside a clip box. */
  readonly positioned = input(false);

  readonly frameW = computed(() => this.cropW());
  readonly frameH = computed(() => this.cropH());

  readonly wrapperTransform = computed(() => {
    const s = this.previewScale();
    return s === 1 ? 'none' : `scale(${s})`;
  });
}
