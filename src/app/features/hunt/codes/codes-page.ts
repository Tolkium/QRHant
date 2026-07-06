import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoModule } from '@jsverse/transloco';
import { FindsStore } from '../../../core/stores/finds.store';
import { PackStore } from '../../../core/stores/pack.store';

type Filter = 'all' | 'found' | 'missing';
type View = 'grid' | 'list';

const VIEW_KEY = 'qrhunt.codesView';

@Component({
  selector: 'app-codes-page',
  imports: [RouterLink, TranslocoModule],
  template: `
    <!-- sticky progress header -->
    <div class="sticky top-[53px] z-[5] bg-page/95 backdrop-blur px-4 pt-3 pb-3 border-b border-line">
      <div class="flex items-center justify-between mb-2">
        <span class="font-extrabold text-lg">
          {{ 'codes.progress' | transloco: { found: foundCount(), total: total() } }}
        </span>
        <!-- grid / list toggle -->
        <div class="flex rounded-lg border border-line overflow-hidden">
          <button
            class="px-3 py-1.5 text-sm font-bold"
            [class.bg-primary]="view() === 'grid'"
            [class.text-primary-ink]="view() === 'grid'"
            (click)="setView('grid')"
            aria-label="Grid view"
          >
            ▦
          </button>
          <button
            class="px-3 py-1.5 text-sm font-bold"
            [class.bg-primary]="view() === 'list'"
            [class.text-primary-ink]="view() === 'list'"
            (click)="setView('list')"
            aria-label="List view"
          >
            ☰
          </button>
        </div>
      </div>
      <div class="h-2.5 rounded-full bg-line overflow-hidden">
        <div
          class="h-full rounded-full bg-primary transition-all duration-500"
          [style.width.%]="total() ? (foundCount() / total()) * 100 : 0"
        ></div>
      </div>
      <div class="flex gap-1.5 mt-3">
        @for (f of filters; track f) {
          <button
            class="rounded-full px-4 py-1.5 text-sm font-semibold border"
            [class.bg-primary]="filter() === f"
            [class.text-primary-ink]="filter() === f"
            [class.border-primary]="filter() === f"
            [class.bg-surface]="filter() !== f"
            [class.border-line]="filter() !== f"
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
      <div class="grid grid-cols-2 gap-3 p-4">
        @for (item of visible(); track item.id) {
          @if (item.found) {
            <a
              [routerLink]="['/hunt/codes', item.id]"
              class="card overflow-hidden flex flex-col shadow-md"
            >
              @if (item.image) {
                <img [src]="item.image" class="w-full aspect-[3/2] object-cover" [alt]="item.title" />
              } @else {
                <div class="w-full aspect-[3/2] bg-primary/10 flex items-center justify-center text-4xl">
                  🎨
                </div>
              }
              <div class="p-3">
                <p class="font-bold leading-tight truncate">{{ item.title }}</p>
                <p class="text-xs text-muted mt-0.5">{{ item.foundAt }}</p>
              </div>
            </a>
          } @else {
            <div
              class="card flex flex-col items-center justify-center gap-1 text-center
                border-dashed bg-transparent aspect-[4/3] opacity-70 p-3"
            >
              <span class="text-3xl select-none grayscale">❓</span>
              <span class="font-bold leading-tight text-muted px-1">{{ item.title }}</span>
              <span class="text-xs text-muted">{{ 'codes.locked' | transloco }}</span>
            </div>
          }
        }
      </div>
    } @else {
      <div class="flex flex-col gap-2 p-4">
        @for (item of visible(); track item.id) {
          @if (item.found) {
            <a
              [routerLink]="['/hunt/codes', item.id]"
              class="card flex items-center gap-3 p-2.5 shadow-sm"
            >
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
              <div class="w-14 h-14 rounded-lg bg-line/50 flex items-center justify-center text-2xl shrink-0 grayscale">
                ❓
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

  setView(view: View): void {
    this.view.set(view);
    localStorage.setItem(VIEW_KEY, view);
  }
}
