import { Component, effect, inject, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminState } from '../admin-state';
import { EventState, HuntEvent } from '../../../core/models';

@Component({
  selector: 'app-events-page',
  imports: [FormsModule],
  template: `
    <h1 class="text-2xl font-extrabold mb-4">Events</h1>

    <!-- create -->
    <form class="card p-4 mb-6 flex gap-2" (ngSubmit)="create()">
      <input class="input flex-1" [(ngModel)]="newName" name="newName" placeholder="New event name" />
      <button class="btn-primary" type="submit" [disabled]="!newName.trim()">Create</button>
    </form>

    @if (draft(); as e) {
      <div class="card p-4 flex flex-col gap-4">
        <div class="flex items-center justify-between flex-wrap gap-2">
          <h2 class="font-bold text-lg">{{ e.name }}</h2>
          <div class="flex gap-2 items-center">
            @if (!e.active) {
              <button class="btn-ghost !min-h-10" (click)="makeActive()">Make active</button>
            } @else {
              <span class="text-good font-bold text-sm">● ACTIVE EVENT</span>
            }
          </div>
        </div>

        <div class="grid md:grid-cols-2 gap-4">
          <div>
            <label class="label" for="ev-name">Name</label>
            <input id="ev-name" class="input" [(ngModel)]="e.name" />
          </div>
          <div>
            <label class="label" for="ev-state">Lifecycle state</label>
            <select id="ev-state" class="input" [(ngModel)]="e.state">
              @for (s of states; track s) {
                <option [value]="s">{{ s }}</option>
              }
            </select>
          </div>
          <div>
            <label class="label" for="ev-starts">Starts at</label>
            <input
              id="ev-starts"
              class="input"
              type="datetime-local"
              [ngModel]="toLocal(e.startsAt)"
              (ngModelChange)="e.startsAt = fromLocal($event)"
            />
          </div>
          <div>
            <label class="label" for="ev-ends">Ends at</label>
            <input
              id="ev-ends"
              class="input"
              type="datetime-local"
              [ngModel]="toLocal(e.endsAt)"
              (ngModelChange)="e.endsAt = fromLocal($event)"
            />
          </div>
        </div>

        <!-- theme editor: server-driven design -->
        <h3 class="font-bold mt-2">Theme (applies to players without any redeploy)</h3>
        <div class="grid md:grid-cols-3 gap-4">
          <div>
            <label class="label" for="th-event">Displayed event name</label>
            <input id="th-event" class="input" [(ngModel)]="e.theme.eventName" />
          </div>
          <div>
            <label class="label" for="th-logo">Logo text</label>
            <input id="th-logo" class="input" [(ngModel)]="e.theme.logoText" />
          </div>
          <div class="grid grid-cols-3 gap-2">
            <div>
              <label class="label" for="th-primary">Primary</label>
              <input id="th-primary" type="color" class="input !p-1" [(ngModel)]="e.theme.primary" />
            </div>
            <div>
              <label class="label" for="th-accent">Accent</label>
              <input id="th-accent" type="color" class="input !p-1" [(ngModel)]="e.theme.accent" />
            </div>
            <div>
              <label class="label" for="th-bg">Background</label>
              <input id="th-bg" type="color" class="input !p-1" [(ngModel)]="e.theme.bg" />
            </div>
          </div>
        </div>

        <div class="flex gap-2 justify-end">
          <button class="btn-primary" (click)="save()">Save event</button>
        </div>
        @if (saved()) {
          <p class="text-good font-semibold text-sm text-right">Saved.</p>
        }
      </div>
    }
  `,
})
export class EventsPage {
  readonly state = inject(AdminState);
  readonly states: EventState[] = ['setup', 'live', 'ended'];
  readonly saved = signal(false);

  newName = '';

  /** Stable mutable copy of the selected event for form editing. */
  readonly draft = signal<HuntEvent | null>(null);

  constructor() {
    effect(() => {
      const selected = this.state.selected();
      const current = untracked(this.draft);
      if (selected && selected.id !== current?.id) {
        this.draft.set(structuredClone(selected));
      } else if (!selected) {
        this.draft.set(null);
      }
    });
  }

  async create(): Promise<void> {
    await this.state.createEvent(this.newName.trim());
    this.newName = '';
  }

  async makeActive(): Promise<void> {
    const e = this.state.selected();
    if (e) await this.state.setActive(e.id);
  }

  async save(): Promise<void> {
    const d = this.draft();
    if (!d) return;
    await this.state.updateEvent(d);
    this.saved.set(true);
    setTimeout(() => this.saved.set(false), 2000);
  }

  toLocal(iso: string): string {
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  fromLocal(local: string): string {
    return new Date(local).toISOString();
  }
}
