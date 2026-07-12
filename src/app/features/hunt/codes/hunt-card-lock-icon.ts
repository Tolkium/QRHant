import { Component, computed, inject } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ThemeStore } from '../../../core/stores/theme.store';
import { huntCardLockSvg } from './hunt-card-lock-icons';

@Component({
  selector: 'app-hunt-card-lock-icon',
  template: `<span class="hunt-card-lock-slot" [innerHTML]="svg()"></span>`,
})
export class HuntCardLockIcon {
  private readonly theme = inject(ThemeStore);
  private readonly sanitizer = inject(DomSanitizer);

  readonly svg = computed<SafeHtml>(() => {
    const cosmeticsId = this.theme.applied()?.cosmeticsId ?? null;
    return this.sanitizer.bypassSecurityTrustHtml(huntCardLockSvg(cosmeticsId));
  });
}
