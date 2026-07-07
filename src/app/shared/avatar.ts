import { Component, computed, input } from '@angular/core';
import { isCustomAvatar, isPresetAvatar } from '../core/models';

const AVATAR_EMOJI: Record<string, string> = {
  fox: '🦊',
  owl: '🦉',
  frog: '🐸',
  cat: '🐱',
  bee: '🐝',
  wolf: '🐺',
  panda: '🐼',
  octopus: '🐙',
};

@Component({
  selector: 'app-avatar',
  template: `
    @if (custom()) {
      <img
        [src]="avatar()"
        alt=""
        class="inline-block rounded-full object-cover bg-primary/10 select-none"
        [style.width.px]="size()"
        [style.height.px]="size()"
      />
    } @else {
      <span
        class="inline-flex items-center justify-center rounded-full bg-primary/10 select-none"
        [style.width.px]="size()"
        [style.height.px]="size()"
        [style.fontSize.px]="size() * 0.55"
        >{{ emoji() }}</span
      >
    }
  `,
})
export class Avatar {
  readonly avatar = input<string>('fox');
  readonly size = input<number>(40);
  readonly custom = computed(() => isCustomAvatar(this.avatar()));
  readonly emoji = computed(() => {
    const id = this.avatar();
    if (isPresetAvatar(id)) return AVATAR_EMOJI[id];
    return '🙂';
  });
}
