import { computed, inject, Injectable, signal } from '@angular/core';
import { AdminApi } from '../../core/backend/api';
import { HuntEvent } from '../../core/models';
import { PackStore } from '../../core/stores/pack.store';

/** Shared admin context: the event list and which event is being managed. */
@Injectable({ providedIn: 'root' })
export class AdminState {
  private readonly api = inject(AdminApi);
  private readonly pack = inject(PackStore);

  private readonly _events = signal<HuntEvent[]>([]);
  private readonly _selectedId = signal<string | null>(null);

  readonly events = this._events.asReadonly();
  readonly selected = computed(
    () => this._events().find((e) => e.id === this._selectedId()) ?? null,
  );

  async load(): Promise<void> {
    const events = await this.api.listEvents();
    this._events.set(events);
    if (!this._selectedId() || !events.some((e) => e.id === this._selectedId())) {
      this._selectedId.set(events.find((e) => e.active)?.id ?? events[0]?.id ?? null);
    }
  }

  select(eventId: string): void {
    this._selectedId.set(eventId);
  }

  async createEvent(name: string): Promise<void> {
    const event = await this.api.createEvent(name);
    await this.load();
    this._selectedId.set(event.id);
  }

  async updateEvent(event: HuntEvent): Promise<void> {
    await this.api.updateEvent(event);
    await this.load();
  }

  async setActive(eventId: string): Promise<void> {
    await this.api.setActiveEvent(eventId);
    await this.load();
    await this.pack.refresh();
  }
}
