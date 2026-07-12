import { Component, input, output } from '@angular/core';
import { ImageCropDialog } from './image-crop-dialog';

/** Avatar crop dialog — thin wrapper around the shared image crop dialog. */
@Component({
  selector: 'app-avatar-crop-dialog',
  imports: [ImageCropDialog],
  template: `
    <app-image-crop-dialog
      variant="avatar"
      [imageSrc]="imageSrc()"
      [file]="file()"
      (confirmed)="confirmed.emit($event)"
      (cancelled)="cancelled.emit()"
    />
  `,
})
export class AvatarCropDialog {
  readonly imageSrc = input.required<string>();
  readonly file = input.required<File>();
  readonly confirmed = output<string>();
  readonly cancelled = output<void>();
}
