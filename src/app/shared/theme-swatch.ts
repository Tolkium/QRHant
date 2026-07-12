import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ThemeTokens } from '../core/models';

@Component({
  selector: 'app-theme-swatch',
  template: `
    <button
      type="button"
      class="theme-swatch"
      [class.active]="active"
      [attr.aria-pressed]="active"
      (click)="selected.emit()"
    >
      <span class="theme-swatch-dots" aria-hidden="true">
        <span [style.background]="tokens.primary"></span>
        <span [style.background]="tokens.accent"></span>
        <span [style.background]="tokens.bg"></span>
      </span>
      <span>{{ name }}</span>
    </button>
  `,
})
export class ThemeSwatch {
  @Input({ required: true }) name!: string;
  @Input({ required: true }) tokens!: ThemeTokens;
  @Input() active = false;
  @Output() readonly selected = new EventEmitter<void>();
}
