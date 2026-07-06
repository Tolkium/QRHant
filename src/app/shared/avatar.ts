import { Component, computed, input } from '@angular/core';

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
    <span
      class="inline-flex items-center justify-center rounded-full bg-primary/10 select-none"
      [style.width.px]="size()"
      [style.height.px]="size()"
      [style.fontSize.px]="size() * 0.55"
      >{{ emoji() }}</span
    >
  `,
})
export class Avatar {
  readonly avatar = input<string>('fox');
  readonly size = input<number>(40);
  readonly emoji = computed(() => AVATAR_EMOJI[this.avatar()] ?? '🙂');
}
