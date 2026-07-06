import { Component, effect, input, signal } from '@angular/core';
import * as QRCode from 'qrcode';

/**
 * Renders a code as a QR image, generated on-device. Error correction H so
 * printed copies survive physical damage.
 */
@Component({
  selector: 'app-qr-image',
  template: `
    @if (dataUrl()) {
      <img
        [src]="dataUrl()"
        [style.width.px]="size()"
        [style.height.px]="size()"
        class="rounded-lg"
        alt="QR code"
      />
    }
  `,
})
export class QrImage {
  readonly code = input.required<string>();
  readonly size = input<number>(220);
  readonly dataUrl = signal<string | null>(null);

  constructor() {
    effect(() => {
      const value = this.code();
      void QRCode.toDataURL(value, {
        errorCorrectionLevel: 'H',
        width: this.size() * 2,
        margin: 2,
      }).then((url) => this.dataUrl.set(url));
    });
  }
}
