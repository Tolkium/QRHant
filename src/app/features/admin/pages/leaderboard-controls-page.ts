import { Component, computed, effect, inject, resource, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminApi } from '../../../core/backend/api';
import { AdminState } from '../admin-state';
import { AnonymizeMode, LeaderboardFlags } from '../../../core/models';

@Component({
  selector: 'app-leaderboard-controls-page',
  imports: [FormsModule],
  template: `
    <h1 class="text-2xl font-extrabold mb-4">Leaderboard controls</h1>

    @if (flags(); as f) {
      <div class="card p-4 flex flex-col gap-4 mb-6">
        <label class="flex items-center gap-3 font-semibold">
          <input type="checkbox" class="w-5 h-5" [(ngModel)]="f.visible" />
          Leaderboard visible to players
        </label>

        <label class="flex items-center gap-3 font-semibold">
          <input type="checkbox" class="w-5 h-5" [(ngModel)]="f.frozen" />
          Freeze leaderboard (endgame drama — players see a "frozen" notice)
        </label>

        <div>
          <label class="label" for="topn">Show only top N places (0 = all)</label>
          <input id="topn" class="input w-32" type="number" min="0" [(ngModel)]="f.topN" />
        </div>

        <div>
          <label class="label" for="anon">Name display</label>
          <select id="anon" class="input" [(ngModel)]="f.anonymize">
            <option value="none">Full nicknames</option>
            <option value="firstLetter">First letter only</option>
            <option value="hidden">Fully hidden</option>
          </select>
        </div>

        <label class="flex items-center gap-3 font-semibold">
          <input type="checkbox" class="w-5 h-5" [(ngModel)]="f.showAvatars" />
          Show avatars
        </label>

        <button class="btn-primary self-end" (click)="save()">Apply flags</button>
        @if (saved()) {
          <p class="text-good font-semibold text-sm text-right">Applied — players see it on next sync.</p>
        }
      </div>
    }

    <!-- live standings preview (admin always sees everything) -->
    <section class="card p-4">
      <h2 class="font-bold mb-3">Full standings (admin view)</h2>
      @for (row of standings(); track row.userId) {
        <div class="flex items-center gap-3 border-b border-line py-2">
          <span class="font-extrabold w-8">{{ row.rank }}.</span>
          <span class="flex-1 font-semibold">{{ row.nickname }}</span>
          <span class="text-primary font-bold">{{ row.count }}</span>
          <span class="text-xs text-muted">{{ formatTime(row.lastFindAt) }}</span>
        </div>
      }
    </section>
  `,
})
export class LeaderboardControlsPage {
  private readonly api = inject(AdminApi);
  private readonly state = inject(AdminState);

  readonly flags = signal<LeaderboardFlags | null>(null);
  readonly saved = signal(false);

  constructor() {
    effect(() => {
      const selected = this.state.selected();
      const current = untracked(this.flags);
      if (selected && (!current || untracked(() => this.lastEventId) !== selected.id)) {
        this.lastEventId = selected.id;
        this.flags.set(structuredClone(selected.leaderboardFlags));
      }
    });
  }

  private lastEventId: string | null = null;

  private readonly findsRes = resource({
    params: () => ({ id: this.state.selected()?.id }),
    loader: async ({ params }) => (params.id ? this.api.listFinds(params.id) : []),
  });
  private readonly playersRes = resource({
    loader: async () => this.api.listPlayers(),
  });

  readonly standings = computed(() => {
    const finds = this.findsRes.value() ?? [];
    const players = this.playersRes.value() ?? [];
    const byUser = new Map<string, { count: number; last: string }>();
    for (const f of finds) {
      const cur = byUser.get(f.userId) ?? { count: 0, last: '' };
      cur.count++;
      if (f.clampedFoundAt > cur.last) cur.last = f.clampedFoundAt;
      byUser.set(f.userId, cur);
    }
    return players
      .filter((p) => byUser.has(p.id))
      .map((p) => ({
        userId: p.id,
        nickname: p.nickname,
        count: byUser.get(p.id)!.count,
        lastFindAt: byUser.get(p.id)!.last,
        rank: 0,
      }))
      .sort((a, b) => b.count - a.count || a.lastFindAt.localeCompare(b.lastFindAt))
      .map((row, i) => ({ ...row, rank: i + 1 }));
  });

  async save(): Promise<void> {
    const selected = this.state.selected();
    const f = this.flags();
    if (!selected || !f) return;
    await this.state.updateEvent({
      ...selected,
      leaderboardFlags: { ...f, anonymize: f.anonymize as AnonymizeMode, topN: Number(f.topN) },
    });
    this.saved.set(true);
    setTimeout(() => this.saved.set(false), 2500);
  }

  formatTime(iso: string): string {
    return new Date(iso).toLocaleTimeString();
  }
}
