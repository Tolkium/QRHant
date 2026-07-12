import { Component, computed, inject, input } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ThemeStore } from '../../core/stores/theme.store';
import { HuntNavIconSlot, huntNavIconSvg } from './hunt-nav-icons';

@Component({
  selector: 'app-hunt-nav-icon',
  template: `<span class="hunt-nav-icon-slot" [innerHTML]="svg()"></span>`,
})
export class HuntNavIcon {
  private readonly theme = inject(ThemeStore);
  private readonly sanitizer = inject(DomSanitizer);

  readonly slot = input.required<HuntNavIconSlot>();

  readonly svg = computed<SafeHtml>(() => {
    const cosmeticsId = this.theme.applied()?.cosmeticsId ?? null;
    const raw = huntNavIconSvg(cosmeticsId, this.slot());
    return this.sanitizer.bypassSecurityTrustHtml(raw);
  });
}
