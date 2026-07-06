import { Component, effect, inject, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminState } from '../admin-state';
import { HuntSettings } from '../../../core/models';

@Component({
  selector: 'app-settings-page',
  imports: [FormsModule],
  template: `
    <h1 class="text-2xl font-extrabold mb-4">Hunt settings</h1>

    @if (settings(); as s) {
      <div class="card p-4 flex flex-col gap-5 max-w-xl">
        <label class="flex items-start gap-3">
          <input type="checkbox" class="w-5 h-5 mt-0.5" [(ngModel)]="s.manualEntryEnabled" />
          <span>
            <span class="font-semibold block">Staff manual code entry</span>
            <span class="text-sm text-muted">
              Default OFF. Enable temporarily when a printed QR is damaged; the entry field
              appears on the player profile page. Switch back off afterwards.
            </span>
          </span>
        </label>

        <div>
          <label class="label" for="strikes">Invalid-code strikes before anomaly flag</label>
          <input id="strikes" class="input w-32" type="number" min="1" [(ngModel)]="s.invalidCodeStrikes" />
          <p class="text-sm text-muted mt-1">
            The app never submits unverified codes, so even a low number only catches API scripters.
          </p>
        </div>

        <div>
          <label class="label" for="rate">Max sync requests per user per minute</label>
          <input id="rate" class="input w-32" type="number" min="1" [(ngModel)]="s.syncRequestsPerMinute" />
        </div>

        <div>
          <label class="label" for="minv">Minimum app version (APK update gate)</label>
          <input id="minv" class="input w-40" [(ngModel)]="s.minAppVersion" />
        </div>

        <button class="btn-primary self-end" (click)="save()">Save settings</button>
        @if (saved()) {
          <p class="text-good font-semibold text-sm text-right">Saved.</p>
        }
      </div>
    }
  `,
})
export class SettingsPage {
  private readonly state = inject(AdminState);

  readonly settings = signal<HuntSettings | null>(null);
  readonly saved = signal(false);

  private lastEventId: string | null = null;

  constructor() {
    effect(() => {
      const selected = this.state.selected();
      if (selected && this.lastEventId !== selected.id) {
        this.lastEventId = selected.id;
        untracked(() => this.settings.set(structuredClone(selected.huntSettings)));
      }
    });
  }

  async save(): Promise<void> {
    const selected = this.state.selected();
    const s = this.settings();
    if (!selected || !s) return;
    await this.state.updateEvent({
      ...selected,
      huntSettings: {
        ...s,
        invalidCodeStrikes: Number(s.invalidCodeStrikes),
        syncRequestsPerMinute: Number(s.syncRequestsPerMinute),
      },
    });
    this.saved.set(true);
    setTimeout(() => this.saved.set(false), 2000);
  }
}
