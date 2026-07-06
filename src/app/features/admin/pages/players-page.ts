import { Component, computed, inject, resource, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminApi } from '../../../core/backend/api';
import { Avatar } from '../../../shared/avatar';

@Component({
  selector: 'app-players-page',
  imports: [FormsModule, Avatar],
  template: `
    <h1 class="text-2xl font-extrabold mb-4">Players</h1>

    <input
      class="input mb-4 max-w-sm"
      [(ngModel)]="query"
      placeholder="Search nickname…"
      (ngModelChange)="search.set($event)"
    />

    <div class="flex flex-col gap-2">
      @for (p of filtered(); track p.id) {
        <div class="card px-4 py-3 flex items-center gap-3 flex-wrap">
          <app-avatar [avatar]="p.avatar" [size]="36" />
          <div class="flex-1 min-w-32">
            <p class="font-semibold" [class.line-through]="p.banned">{{ p.nickname }}</p>
            <p class="text-xs text-muted">{{ p.email || 'no e-mail' }}</p>
          </div>
          @if (p.banned) {
            <span class="text-bad text-xs font-bold uppercase">banned</span>
          }
          <button class="btn-ghost !min-h-9 text-sm" (click)="resetPw(p.id, p.nickname)">
            Reset password
          </button>
          <button
            class="!min-h-9 text-sm"
            [class]="p.banned ? 'btn-ghost' : 'btn-danger'"
            (click)="toggleBan(p.id, p.banned)"
          >
            {{ p.banned ? 'Unban' : 'Ban' }}
          </button>
        </div>
      }
    </div>
  `,
})
export class PlayersPage {
  private readonly api = inject(AdminApi);

  readonly search = signal('');
  query = '';

  private readonly playersRes = resource({
    params: () => ({ q: this.search(), v: this.reloadTick() }),
    loader: async () => this.api.listPlayers(),
  });

  readonly reloadTick = signal(0);

  readonly filtered = computed(() => {
    const q = this.search().toLowerCase();
    return (this.playersRes.value() ?? []).filter((p) =>
      p.nickname.toLowerCase().includes(q),
    );
  });

  async toggleBan(userId: string, banned: boolean): Promise<void> {
    await this.api.setBanned(userId, !banned);
    this.reloadTick.update((n) => n + 1);
  }

  async resetPw(userId: string, nickname: string): Promise<void> {
    const pw = prompt(`New password for ${nickname}:`);
    if (!pw || pw.length < 6) {
      if (pw !== null) alert('Password must be at least 6 characters.');
      return;
    }
    await this.api.resetPassword(userId, pw);
    alert(`Password for ${nickname} was reset.`);
  }
}
