import { Component, computed, effect, HostListener, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AdminApi } from '../../../core/backend/api';
import { AdminState } from '../admin-state';
import { CodeRecord, EventMap } from '../../../core/models';
import { compressImageFile } from '../../../shared/image-utils';

const HOLD_MS = 450;
const DRAG_PX = 8;
const MAP_KEY = 'qrhunt.adminMapId';

interface PinGesture {
  code: CodeRecord;
  startX: number;
  startY: number;
  moved: boolean;
  holdTimer: ReturnType<typeof setTimeout> | null;
}

@Component({
  selector: 'app-map-page',
  imports: [FormsModule, RouterLink],
  template: `
    <div class="flex items-center justify-between flex-wrap gap-2 mb-1">
      <h1 class="text-2xl font-extrabold">Maps</h1>
      @if (maps().length) {
        <a
          class="btn-ghost !min-h-10"
          routerLink="/admin/map-print"
          target="_blank"
          [queryParams]="activeMapId() ? { mapId: activeMapId() } : {}"
        >
          🖨️ Print {{ activeMapId() ? 'this map' : 'all maps' }}
        </a>
      }
    </div>
    <p class="text-muted text-sm mb-4">
      One map per building or area. Pick a code below, click the map to place it. Click a pin to
      open details. Hold and drag to move a pin.
    </p>

    <div class="flex flex-wrap gap-2 mb-4 items-center">
      @for (m of maps(); track m.id) {
        <button
          class="rounded-full px-4 py-2 text-sm font-semibold border"
          [class.bg-primary]="activeMapId() === m.id"
          [class.text-primary-ink]="activeMapId() === m.id"
          [class.border-primary]="activeMapId() === m.id"
          [class.bg-surface]="activeMapId() !== m.id"
          [class.border-line]="activeMapId() !== m.id"
          (click)="selectMap(m.id)"
        >
          {{ m.name }}
        </button>
      }
      <button class="btn-ghost !min-h-9 text-sm" (click)="showAdd.set(!showAdd())">+ Add map</button>
    </div>

    @if (showAdd()) {
      <div class="card p-4 mb-4 flex flex-col gap-3 max-w-md">
        <div>
          <label class="label" for="new-map-name">Map name</label>
          <input
            id="new-map-name"
            class="input"
            [(ngModel)]="newMapName"
            placeholder="e.g. Main building, Camp B"
          />
        </div>
        <label class="btn-primary !min-h-10 cursor-pointer inline-flex w-fit">
          @if (uploading()) {
            Uploading…
          } @else {
            Upload plan image
          }
          <input
            type="file"
            accept="image/*"
            class="hidden"
            [disabled]="uploading()"
            (change)="addMap($event)"
          />
        </label>
        @if (uploadError()) {
          <p class="text-sm text-bad">{{ uploadError() }}</p>
        }
      </div>
    }

    @if (activeMap(); as map) {
      <div class="card p-4 mb-4 flex gap-3 items-end flex-wrap">
        <div class="flex-1 min-w-48">
          <label class="label" [for]="'map-name-' + map.id">Map name</label>
          <input
            [id]="'map-name-' + map.id"
            class="input"
            [value]="map.name"
            (blur)="renameMap(map.id, $any($event.target).value)"
          />
        </div>
        <label class="btn-ghost !min-h-10 cursor-pointer inline-flex">
          Change image
          <input type="file" accept="image/*" class="hidden" (change)="replaceImage(map.id, $event)" />
        </label>
        <button class="btn-danger !min-h-10" (click)="deleteMap(map.id)">Delete map</button>
        <div class="flex-1 min-w-52">
          <label class="label" for="pin-code">Place on map</label>
          <select id="pin-code" class="input" [(ngModel)]="selectedCodeId">
            <option value="">— pick a code —</option>
            @for (c of unplaced(); track c.id) {
              <option [value]="c.id">{{ c.title }} ({{ c.code }})</option>
            }
          </select>
        </div>
      </div>

      <div
        class="relative inline-block select-none max-w-full border border-line rounded-xl overflow-hidden touch-none"
        (pointerup)="onMapPointerUp($event)"
        (pointermove)="onMapPointerMove($event)"
        (pointerleave)="cancelPinGesture()"
        (pointercancel)="cancelPinGesture()"
      >
        <img [src]="map.image" class="max-w-full block pointer-events-none" [alt]="map.name" />
        @for (c of placed(); track c.id) {
          <button
            type="button"
            class="map-pin absolute -translate-x-1/2 -translate-y-full flex flex-col items-center max-w-[5.5rem]"
            [style.left.%]="c.mapX! * 100"
            [style.top.%]="c.mapY! * 100"
            (pointerdown)="onPinPointerDown(c, $event)"
            [class.opacity-60]="dragging()?.id === c.id"
            [class.ring-2]="pinPanel()?.id === c.id"
            [class.ring-primary]="pinPanel()?.id === c.id"
          >
            <span class="text-3xl drop-shadow leading-none">📍</span>
            <span
              class="text-[10px] font-bold bg-surface/95 border border-line rounded px-1 -mt-0.5
                leading-tight text-center line-clamp-2"
            >
              {{ c.title }}
            </span>
          </button>
        }

        @if (pinPanel(); as pin) {
          <div
            class="absolute z-20 w-56 card p-3 shadow-lg flex flex-col gap-2 border-2 border-primary"
            [style.left.%]="panelPos().x * 100"
            [style.top.%]="panelPos().y * 100"
            (pointerdown)="$event.stopPropagation()"
            (pointerup)="$event.stopPropagation()"
          >
            <p class="font-bold leading-tight">{{ pin.title }}</p>
            <p class="font-mono text-xs text-muted tracking-widest">{{ pin.code }}</p>
            <div>
              <label class="label text-xs" [for]="'note-' + pin.id">Note (optional)</label>
              <textarea
                [id]="'note-' + pin.id"
                class="input !min-h-14 text-sm"
                rows="2"
                [(ngModel)]="noteDraft"
                placeholder="e.g. by the fountain"
              ></textarea>
            </div>
            <div class="flex gap-2">
              <button class="btn-primary flex-1 !min-h-9 text-sm" (click)="savePinNote(pin)">
                Save
              </button>
              <button class="btn-ghost flex-1 !min-h-9 text-sm" (click)="closePanel()">Close</button>
            </div>
            <button class="btn-danger !min-h-9 text-sm" (click)="removePin(pin)">
              Remove from map
            </button>
          </div>
        }
      </div>
    } @else if (!showAdd()) {
      <p class="card p-8 text-center text-muted">
        No maps yet. Click <strong>+ Add map</strong> to upload your first site plan.
      </p>
    }
  `,
})
export class MapPage {
  private readonly api = inject(AdminApi);
  private readonly state = inject(AdminState);

  readonly codes = signal<CodeRecord[]>([]);
  readonly dragging = signal<CodeRecord | null>(null);
  readonly pinPanel = signal<CodeRecord | null>(null);
  readonly panelPos = signal({ x: 0.5, y: 0.5 });
  readonly uploading = signal(false);
  readonly uploadError = signal<string | null>(null);
  readonly showAdd = signal(false);
  readonly activeMapId = signal<string | null>(localStorage.getItem(MAP_KEY));

  newMapName = '';
  selectedCodeId = '';
  noteDraft = '';

  private pinGesture: PinGesture | null = null;
  private mapBox: HTMLElement | null = null;

  readonly maps = computed(() => this.state.selected()?.maps ?? []);

  readonly activeMap = computed(() => {
    const id = this.activeMapId();
    return this.maps().find((m) => m.id === id) ?? this.maps()[0] ?? null;
  });

  readonly placed = computed(() => {
    const mapId = this.activeMap()?.id;
    if (!mapId) return [];
    return this.codes().filter(
      (c) => c.mapId === mapId && c.mapX !== null && c.mapY !== null,
    );
  });

  readonly unplaced = computed(() => {
    const mapId = this.activeMap()?.id;
    if (!mapId) return [];
    return this.codes().filter(
      (c) => c.mapId !== mapId || c.mapX === null || c.mapY === null,
    );
  });

  constructor() {
    effect(() => {
      this.state.selected();
      const list = this.maps();
      const current = this.activeMapId();
      if (list.length && (!current || !list.some((m) => m.id === current))) {
        this.selectMap(list[0].id);
      }
      void this.reload();
    });
  }

  selectMap(id: string): void {
    this.activeMapId.set(id);
    localStorage.setItem(MAP_KEY, id);
    this.closePanel();
  }

  closePanel(): void {
    this.pinPanel.set(null);
    this.noteDraft = '';
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.pinPanel()) this.closePanel();
  }

  openPanel(pin: CodeRecord): void {
    this.pinPanel.set(pin);
    this.noteDraft = pin.mapNote ?? '';
    if (pin.mapX !== null && pin.mapY !== null) {
      this.panelPos.set({
        x: Math.min(0.72, Math.max(0.05, pin.mapX)),
        y: Math.min(0.75, Math.max(0.05, pin.mapY)),
      });
    }
  }

  private async reload(): Promise<void> {
    const id = this.state.selected()?.id;
    this.codes.set(id ? await this.api.listCodes(id) : []);
  }

  async addMap(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    const selected = this.state.selected();
    const name = this.newMapName.trim() || `Map ${this.maps().length + 1}`;
    if (!file || !selected) {
      this.uploadError.set('Pick an image file.');
      return;
    }
    this.uploading.set(true);
    this.uploadError.set(null);
    try {
      const image = await compressImageFile(file, 2400, 0.82);
      const map: EventMap = { id: crypto.randomUUID(), name, image };
      await this.state.updateEvent({ ...selected, maps: [...selected.maps, map] });
      this.newMapName = '';
      this.showAdd.set(false);
      this.selectMap(map.id);
      input.value = '';
    } catch (err) {
      this.uploadError.set(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      this.uploading.set(false);
    }
  }

  async replaceImage(mapId: string, event: Event): Promise<void> {
    const file = (event.target as HTMLInputElement).files?.[0];
    const selected = this.state.selected();
    if (!file || !selected) return;
    try {
      const image = await compressImageFile(file, 2400, 0.82);
      const maps = selected.maps.map((m) => (m.id === mapId ? { ...m, image } : m));
      await this.state.updateEvent({ ...selected, maps });
      (event.target as HTMLInputElement).value = '';
    } catch {
      this.uploadError.set('Could not replace image.');
    }
  }

  async renameMap(mapId: string, name: string): Promise<void> {
    const selected = this.state.selected();
    if (!selected || !name.trim()) return;
    const maps = selected.maps.map((m) => (m.id === mapId ? { ...m, name: name.trim() } : m));
    await this.state.updateEvent({ ...selected, maps });
  }

  async deleteMap(mapId: string): Promise<void> {
    const selected = this.state.selected();
    if (!selected) return;
    const map = selected.maps.find((m) => m.id === mapId);
    if (!map || !confirm(`Delete "${map.name}" and remove all pins on it?`)) return;
    for (const c of this.codes().filter((x) => x.mapId === mapId)) {
      await this.api.updateCode({ ...c, mapId: null, mapX: null, mapY: null, mapNote: null });
    }
    const maps = selected.maps.filter((m) => m.id !== mapId);
    await this.state.updateEvent({ ...selected, maps });
    if (this.activeMapId() === mapId) {
      if (maps.length) this.selectMap(maps[0].id);
      else {
        localStorage.removeItem(MAP_KEY);
        this.activeMapId.set(null);
      }
    }
    await this.reload();
  }

  onPinPointerDown(code: CodeRecord, event: PointerEvent): void {
    event.stopPropagation();
    event.preventDefault();
    this.mapBox = (event.currentTarget as HTMLElement).parentElement;
    const isTouch = event.pointerType === 'touch';
    const gesture: PinGesture = {
      code,
      startX: event.clientX,
      startY: event.clientY,
      moved: false,
      holdTimer: isTouch
        ? setTimeout(() => {
            if (this.pinGesture?.code.id === code.id) {
              this.dragging.set(code);
            }
          }, HOLD_MS)
        : null,
    };
    this.pinGesture = gesture;
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  }

  onMapPointerMove(event: PointerEvent): void {
    const g = this.pinGesture;
    const drag = this.dragging();
    if (g && !drag) {
      const dx = event.clientX - g.startX;
      const dy = event.clientY - g.startY;
      if (Math.hypot(dx, dy) >= DRAG_PX) {
        g.moved = true;
        if (g.holdTimer) {
          clearTimeout(g.holdTimer);
          g.holdTimer = null;
        }
        this.dragging.set(g.code);
      }
    }
    if (drag && this.mapBox) {
      const { x, y } = this.relative(this.mapBox, event.clientX, event.clientY);
      this.codes.update((list) =>
        list.map((c) => (c.id === drag.id ? { ...c, mapX: x, mapY: y } : c)),
      );
    }
  }

  onMapPointerUp(event: PointerEvent): void {
    const g = this.pinGesture;
    const drag = this.dragging();

    if (drag && this.mapBox) {
      const { x, y } = this.relative(this.mapBox, event.clientX, event.clientY);
      void this.savePosition(drag, x, y);
      this.dragging.set(null);
      this.pinGesture = null;
      return;
    }

    if (g) {
      if (g.holdTimer) {
        clearTimeout(g.holdTimer);
        g.holdTimer = null;
      }
      if (!g.moved) {
        this.openPanel(g.code);
      }
      this.pinGesture = null;
      return;
    }

    if ((event.target as HTMLElement).closest('.map-pin')) return;
    if (!this.selectedCodeId) return;
    this.mapBox = event.currentTarget as HTMLElement;
    const { x, y } = this.relative(this.mapBox, event.clientX, event.clientY);
    void this.placeSelectedAt(x, y);
  }

  cancelPinGesture(): void {
    if (this.pinGesture?.holdTimer) clearTimeout(this.pinGesture.holdTimer);
    this.pinGesture = null;
    if (this.dragging()) this.dragging.set(null);
  }

  async savePinNote(pin: CodeRecord): Promise<void> {
    const note = this.noteDraft.trim() || null;
    await this.api.updateCode({ ...pin, mapNote: note });
    await this.reload();
    const updated = this.codes().find((c) => c.id === pin.id);
    if (updated) this.pinPanel.set(updated);
  }

  async removePin(code: CodeRecord): Promise<void> {
    await this.api.updateCode({
      ...code,
      mapId: null,
      mapX: null,
      mapY: null,
      mapNote: null,
    });
    await this.reload();
    this.closePanel();
  }

  private relative(box: HTMLElement, clientX: number, clientY: number): { x: number; y: number } {
    const rect = box.getBoundingClientRect();
    return {
      x: Math.min(1, Math.max(0, (clientX - rect.left) / rect.width)),
      y: Math.min(1, Math.max(0, (clientY - rect.top) / rect.height)),
    };
  }

  private async placeSelectedAt(x: number, y: number): Promise<void> {
    const mapId = this.activeMap()?.id;
    if (!mapId || !this.selectedCodeId) return;
    const code = this.codes().find((c) => c.id === this.selectedCodeId);
    if (!code) return;
    await this.savePosition(code, x, y, mapId);
    this.selectedCodeId = '';
  }

  private async savePosition(
    code: CodeRecord,
    x: number,
    y: number,
    mapId?: string,
  ): Promise<void> {
    const mid = mapId ?? this.activeMap()?.id;
    if (!mid) return;
    await this.api.updateCode({ ...code, mapId: mid, mapX: x, mapY: y });
    await this.reload();
  }
}
