import { Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { FindsStore } from '../../../core/stores/finds.store';
import { Lang } from '../../../core/models';

@Component({
  selector: 'app-card-detail-page',
  imports: [RouterLink, TranslocoModule],
  template: `
    @if (find(); as f) {
      <div class="p-4 max-w-md mx-auto flex flex-col gap-3">
        <a routerLink="/hunt/codes" class="text-primary font-semibold py-1">
          ← {{ 'common.back' | transloco }}
        </a>
        <div class="card overflow-hidden">
          @if (f.content.image) {
            <img
              [src]="f.content.image"
              class="w-full aspect-[3/2] object-cover"
              [alt]="f.content.title"
            />
          } @else {
            <div class="w-full aspect-[3/2] bg-primary/10 flex items-center justify-center text-6xl">
              🎨
            </div>
          }
          <div class="p-5 flex flex-col gap-3">
            <h1 class="text-2xl font-extrabold leading-tight">{{ f.content.title }}</h1>
            <p class="text-ink/90 leading-relaxed">{{ artText() }}</p>
            <div class="flex items-center border-t border-line pt-3 mt-1">
              <span class="text-sm text-muted">
                {{ 'detail.foundAt' | transloco: { time: foundAt() } }}
              </span>
            </div>
          </div>
        </div>
      </div>
    } @else {
      <div class="p-8 text-center text-muted">
        <a routerLink="/hunt/codes" class="text-primary font-semibold">
          ← {{ 'common.back' | transloco }}
        </a>
      </div>
    }
  `,
})
export class CardDetailPage {
  private readonly finds = inject(FindsStore);
  private readonly transloco = inject(TranslocoService);

  readonly codeId = input.required<string>();

  readonly find = computed(() => this.finds.findOf(this.codeId()));
  readonly foundAt = computed(() => {
    const f = this.find();
    return f ? new Date(f.clientFoundAt).toLocaleString() : '';
  });
  readonly artText = computed(() => {
    const f = this.find();
    if (!f) return '';
    const lang = this.transloco.getActiveLang() as Lang;
    return f.content.art[lang] || f.content.art.en;
  });
}
