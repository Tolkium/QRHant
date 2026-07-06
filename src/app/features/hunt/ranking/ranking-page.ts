import { Component, computed, effect, inject, resource, signal } from '@angular/core';
import { TranslocoModule } from '@jsverse/transloco';
import { LeaderboardApi } from '../../../core/backend/api';
import { PackStore } from '../../../core/stores/pack.store';
import { SyncEngine } from '../../../core/sync/sync-engine';
import { Avatar } from '../../../shared/avatar';
import { LeaderboardEntry } from '../../../core/models';

@Component({
  selector: 'app-ranking-page',
  imports: [TranslocoModule, Avatar],
  template: `
    <div class="p-4 max-w-md mx-auto flex flex-col gap-3">
      <h1 class="text-2xl font-extrabold">{{ 'rank.title' | transloco }}</h1>

      @if (view(); as v) {
        @if (v.flags.frozen) {
          <p class="card p-3 text-center text-sm font-semibold text-accent">
            {{ 'rank.frozen' | transloco }}
          </p>
        }
        @if (!v.flags.visible) {
          <p class="text-center text-muted p-10">{{ 'rank.hidden' | transloco }}</p>
        } @else {
          <ol class="flex flex-col gap-2">
            @for (row of v.entries; track row.userId) {
              <li
                class="card px-4 py-3 flex items-center gap-3"
                [class.!border-primary]="row.isYou"
                [class.border-2]="row.isYou"
              >
                <span class="font-extrabold w-8 text-center text-lg">
                  {{ medal(row.rank) }}
                </span>
                @if (v.flags.showAvatars) {
                  <app-avatar [avatar]="row.avatar" [size]="36" />
                }
                <span class="flex-1 font-semibold truncate">
                  {{ displayName(row) }}
                  @if (row.isYou) {
                    <span class="text-primary text-xs">({{ 'rank.you' | transloco }})</span>
                  }
                </span>
                <span class="font-bold text-primary">
                  {{ 'rank.codes' | transloco: { count: row.count } }}
                </span>
              </li>
            }
          </ol>

          <!-- pinned own row when outside the shown list -->
          @if (v.you && !shownContainsYou()) {
            <div class="sticky bottom-24 mt-2">
              <div class="card px-4 py-3 flex items-center gap-3 border-2 !border-primary shadow-lg">
                <span class="font-extrabold w-8 text-center text-lg">{{ v.you.rank }}.</span>
                <span class="flex-1 font-semibold">{{ 'rank.you' | transloco }}</span>
                <span class="font-bold text-primary">
                  {{ 'rank.codes' | transloco: { count: v.you.count } }}
                </span>
              </div>
            </div>
          }
        }
      }
    </div>
  `,
})
export class RankingPage {
  private readonly api = inject(LeaderboardApi);
  private readonly pack = inject(PackStore);
  private readonly sync = inject(SyncEngine);

  /** bumped by the realtime subscription (Supabase) to refetch standings */
  private readonly liveTick = signal(0);

  private readonly board = resource({
    params: () => ({
      eventId: this.pack.event()?.id,
      // refetch after each successful sync and on live updates
      lastSync: this.sync.lastSyncAt(),
      tick: this.liveTick(),
    }),
    loader: async ({ params }) =>
      params.eventId ? this.api.getLeaderboard(params.eventId) : null,
  });

  constructor() {
    effect((onCleanup) => {
      const eventId = this.pack.event()?.id;
      if (!eventId) return;
      const unsub = this.api.subscribe(eventId, () => this.liveTick.update((n) => n + 1));
      onCleanup(unsub);
    });
  }

  readonly view = computed(() => this.board.value() ?? null);

  readonly shownContainsYou = computed(() => {
    const v = this.view();
    return !!v?.entries.some((e) => e.isYou);
  });

  medal(rank: number): string {
    return ['🥇', '🥈', '🥉'][rank - 1] ?? `${rank}.`;
  }

  displayName(row: LeaderboardEntry): string {
    const mode = this.view()?.flags.anonymize ?? 'none';
    if (mode === 'none' || row.isYou) return row.nickname;
    if (mode === 'firstLetter') return row.nickname[0] + '…';
    return '•••';
  }
}
