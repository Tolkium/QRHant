import { Component, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AdminApi } from '../../../core/backend/api';
import { AdminState } from '../admin-state';
import { CodeRecord } from '../../../core/models';
import { QrImage } from '../../../shared/qr-image';
import { compressImageFile } from '../../../shared/image-utils';

@Component({
  selector: 'app-admin-codes-page',
  imports: [FormsModule, RouterLink, QrImage],
  template: `
    <div class="flex items-center justify-between flex-wrap gap-2 mb-4">
      <h1 class="text-2xl font-extrabold">Codes ({{ codes().length }})</h1>
      <a routerLink="/admin/print" target="_blank" class="btn-ghost !min-h-10">
        🖨️ Print sheet (PDF)
      </a>
    </div>

    <!-- bulk generate -->
    <form class="card p-4 mb-6 flex gap-2 flex-wrap items-end" (ngSubmit)="generate()">
      <div>
        <label class="label" for="gen-count">How many</label>
        <input id="gen-count" class="input w-28" type="number" min="1" max="500" [(ngModel)]="genCount" name="genCount" />
      </div>
      <div class="flex-1 min-w-40">
        <label class="label" for="gen-prefix">Title prefix</label>
        <input id="gen-prefix" class="input" [(ngModel)]="genPrefix" name="genPrefix" />
      </div>
      <button class="btn-primary" type="submit" [disabled]="generating()">
        {{ generating() ? 'Generating…' : 'Bulk generate' }}
      </button>
    </form>

    <div class="flex flex-col gap-3">
      @for (c of codes(); track c.id) {
        <div class="card p-4">
          <div class="flex items-start gap-4 flex-wrap">
            <div class="flex flex-col items-center gap-2">
              <app-qr-image [code]="c.code" [size]="90" />
              <span class="font-mono font-bold tracking-widest">{{ c.code }}</span>
              @if (c.image) {
                <img [src]="c.image" class="w-24 h-16 object-cover rounded-lg border border-line" alt="Artwork" />
              }
              <label class="btn-ghost !min-h-9 text-sm cursor-pointer">
                {{ c.image ? 'Change photo' : 'Add photo' }}
                <input type="file" accept="image/*" class="hidden" (change)="pickImage(c, $event)" />
              </label>
              @if (c.image) {
                <button class="text-bad text-xs font-semibold" (click)="c.image = null">Remove photo</button>
              }
            </div>
            <div class="flex-1 min-w-64 grid gap-2">
              <input class="input" [(ngModel)]="c.title" placeholder="Title" />
              <textarea class="input !min-h-16" rows="2" [(ngModel)]="c.art.en" placeholder="Art text (EN)"></textarea>
              <textarea class="input !min-h-16" rows="2" [(ngModel)]="c.art.sk" placeholder="Art text (SK)"></textarea>
              <textarea class="input !min-h-16" rows="2" [(ngModel)]="c.art.cs" placeholder="Art text (CS)"></textarea>
              <div class="flex items-end gap-2 flex-wrap">
                <div>
                  <label class="label" [for]="'rel-' + c.id">Release at (empty = from start)</label>
                  <input
                    [id]="'rel-' + c.id"
                    class="input"
                    type="datetime-local"
                    [ngModel]="toLocal(c.releaseAt)"
                    (ngModelChange)="c.releaseAt = fromLocal($event)"
                  />
                </div>
                <button class="btn-primary !min-h-10" (click)="save(c)">Save</button>
                <button class="btn-danger !min-h-10" (click)="remove(c)">Delete</button>
                @if (savedId() === c.id) {
                  <span class="text-good font-semibold text-sm pb-2">Saved (pack updated)</span>
                }
              </div>
            </div>
          </div>
        </div>
      }
    </div>
  `,
})
export class AdminCodesPage {
  private readonly api = inject(AdminApi);
  private readonly state = inject(AdminState);

  readonly codes = signal<CodeRecord[]>([]);
  readonly generating = signal(false);
  readonly savedId = signal<string | null>(null);

  genCount = 10;
  genPrefix = 'Artwork';

  private readonly eventId = computed(() => this.state.selected()?.id ?? null);

  constructor() {
    // reload code list whenever the selected event changes
    effect(() => {
      this.eventId();
      void this.reload();
    });
  }

  async reload(): Promise<void> {
    const id = this.eventId();
    this.codes.set(id ? await this.api.listCodes(id) : []);
  }

  async generate(): Promise<void> {
    const id = this.eventId();
    if (!id) return;
    this.generating.set(true);
    try {
      await this.api.bulkGenerateCodes(id, { count: this.genCount, titlePrefix: this.genPrefix });
      await this.reload();
    } finally {
      this.generating.set(false);
    }
  }

  /** Compress the picked photo to max 900px JPEG so 100 packs stay small. */
  async pickImage(code: CodeRecord, event: Event): Promise<void> {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    code.image = await compressImageFile(file, 900, 0.8);
    (event.target as HTMLInputElement).value = '';
  }

  async save(code: CodeRecord): Promise<void> {
    await this.api.updateCode(code);
    this.savedId.set(code.id);
    setTimeout(() => this.savedId.set(null), 2000);
  }

  async remove(code: CodeRecord): Promise<void> {
    if (!confirm(`Delete code ${code.code} (${code.title})?`)) return;
    await this.api.deleteCode(code.id);
    await this.reload();
  }

  toLocal(iso: string | null): string {
    if (!iso) return '';
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  fromLocal(local: string): string | null {
    return local ? new Date(local).toISOString() : null;
  }
}
