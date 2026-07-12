import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoModule } from '@jsverse/transloco';
import { FindsStore } from '../../../core/stores/finds.store';
import { PackStore } from '../../../core/stores/pack.store';
import { HuntCard } from './hunt-card';
import { HuntCardLockIcon } from './hunt-card-lock-icon';

type Filter = 'all' | 'found' | 'missing';
type View = 'grid' | 'list';

const VIEW_KEY = 'qrhunt.codesView';

@Component({
  selector: 'app-codes-page',
  imports: [RouterLink, TranslocoModule, HuntCard, HuntCardLockIcon],
  template: `
    <div class="hunt-progress">
      <div class="hunt-progress-row">
        <span class="hunt-progress-title">
          {{ 'codes.progress' | transloco: { found: foundCount(), total: total() } }}
        </span>
        <button
          type="button"
          class="hunt-layout-toggle"
          (click)="toggleView()"
          [attr.aria-label]="view() === 'grid' ? 'Grid view' : 'List view'"
        >
          {{ view() === 'grid' ? '▦' : '☰' }}
        </button>
      </div>
      <div class="hunt-progress-bar">
        <div
          class="hunt-progress-fill"
          [style.width.%]="total() ? (foundCount() / total()) * 100 : 0"
        ></div>
      </div>
      <div class="hunt-filters">
        @for (f of filters; track f) {
          <button
            type="button"
            class="hunt-chip"
            [class.on]="filter() === f"
            (click)="filter.set(f)"
          >
            {{ 'codes.filter.' + f | transloco }}
          </button>
        }
      </div>
    </div>

    @if (total() === 0) {
      <p class="text-center text-muted p-10">{{ 'codes.empty' | transloco }}</p>
    }

    @if (view() === 'grid') {
      <div class="hunt-card-grid">
        @for (item of visible(); track item.id; let i = $index) {
          <app-hunt-card
            [found]="item.found"
            [title]="item.title"
            [meta]="item.found ? item.foundAt : ('codes.locked' | transloco)"
            [image]="item.image"
            [index]="i"
            [link]="item.found ? '/hunt/codes/' + item.id : null"
          />
        }
      </div>
    } @else {
      <div class="flex flex-col gap-2 p-4">
        @for (item of visible(); track item.id) {
          @if (item.found) {
            <a [routerLink]="['/hunt/codes', item.id]" class="card flex items-center gap-3 p-2.5 shadow-sm">
              @if (item.image) {
                <img [src]="item.image" class="w-14 h-14 rounded-lg object-cover shrink-0" [alt]="item.title" />
              } @else {
                <div class="w-14 h-14 rounded-lg bg-primary/10 flex items-center justify-center text-2xl shrink-0">
                  🎨
                </div>
              }
              <div class="min-w-0 flex-1">
                <p class="font-bold truncate">{{ item.title }}</p>
                <p class="text-xs text-muted">{{ item.foundAt }}</p>
              </div>
              <span class="text-muted pr-1">›</span>
            </a>
          } @else {
            <div class="card flex items-center gap-3 p-2.5 border-dashed bg-transparent opacity-70">
              <div class="w-14 h-14 rounded-lg bg-line/50 flex items-center justify-center shrink-0 grayscale text-muted hunt-card-lock-list">
                <app-hunt-card-lock-icon />
              </div>
              <div class="min-w-0 flex-1">
                <p class="font-bold truncate text-muted">{{ item.title }}</p>
                <p class="text-xs text-muted">{{ 'codes.locked' | transloco }}</p>
              </div>
            </div>
          }
        }
      </div>
    }
  `,
})
export class CodesPage {
  private readonly pack = inject(PackStore);
  private readonly finds = inject(FindsStore);

  readonly filters: Filter[] = ['all', 'found', 'missing'];
  readonly filter = signal<Filter>('all');
  readonly view = signal<View>((localStorage.getItem(VIEW_KEY) as View) ?? 'grid');

  readonly total = computed(() => this.pack.releasedEntries().length);
  readonly foundCount = computed(() => this.finds.foundCount());

  readonly visible = computed(() => {
    const items = this.pack.releasedEntries().map((entry) => {
      const find = this.finds.findOf(entry.id);
      const found = !!find;
      return {
        id: entry.id,
        found,
        title: found ? find!.content.title : (entry.title || '???'),
        image: find?.content.image ?? null,
        foundAt: find ? new Date(find.clientFoundAt).toLocaleString() : '',
      };
    });
    items.sort((a, b) => Number(b.found) - Number(a.found));
    const f = this.filter();
    if (f === 'found') return items.filter((i) => i.found);
    if (f === 'missing') return items.filter((i) => !i.found);
    return items;
  });

  toggleView(): void {
    const next: View = this.view() === 'grid' ? 'list' : 'grid';
    this.setView(next);
  }

  setView(view: View): void {
    this.view.set(view);
    localStorage.setItem(VIEW_KEY, view);
  }
}
