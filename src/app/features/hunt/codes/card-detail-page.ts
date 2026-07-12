import { Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { FindsStore } from '../../../core/stores/finds.store';
import { Lang } from '../../../core/models';

@Component({
  selector: 'app-card-detail-page',
  imports: [RouterLink, TranslocoModule],
  styles: `
    .hunt-card-detail {
      position: relative;
      aspect-ratio: 3 / 4;
      width: 100%;
      max-height: 72vh;
      overflow: hidden;
    }
    .hunt-card-detail-art {
      position: absolute;
      inset: 0;
    }
    .hunt-card-detail-art img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .hunt-card-detail-body {
      position: absolute;
      left: 0;
      right: 0;
      bottom: 0;
      z-index: 2;
      padding: 1.75rem 0.75rem 0.65rem;
      background: linear-gradient(
        to top,
        rgba(0, 0, 0, 0.78) 0%,
        rgba(0, 0, 0, 0.42) 55%,
        transparent 100%
      );
      color: #fff;
    }
    .hunt-card-detail-title {
      font-family: var(--c-font-display, inherit);
      font-weight: 800;
      font-size: 1.1rem;
      line-height: 1.15;
    }
    .hunt-card-detail-meta {
      font-size: 0.72rem;
      color: rgba(255, 255, 255, 0.82);
      margin-top: 0.25rem;
    }
    .hunt-card-detail-copy {
      font-size: 0.76rem;
      line-height: 1.5;
      color: var(--c-muted);
      padding: 0 0.15rem 0.5rem;
    }
  `,
  template: `
    @if (find(); as f) {
      <div class="p-4 max-w-md mx-auto flex flex-col gap-3">
        <a routerLink="/hunt/codes" class="text-primary font-semibold py-1">
          ← {{ 'common.back' | transloco }}
        </a>
        <div class="card hunt-card hunt-card-detail">
          <div class="hunt-card-detail-art">
            @if (f.content.image) {
              <img [src]="f.content.image" [alt]="f.content.title" />
            } @else {
              <div class="w-full h-full bg-primary/10 flex items-center justify-center text-6xl">🎨</div>
            }
          </div>
          <div class="hunt-card-detail-body">
            <h1 class="hunt-card-detail-title">{{ f.content.title }}</h1>
            <p class="hunt-card-detail-meta">
              {{ 'detail.foundAt' | transloco: { time: foundAt() } }}
            </p>
          </div>
        </div>
        <p class="hunt-card-detail-copy">{{ artText() }}</p>
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
