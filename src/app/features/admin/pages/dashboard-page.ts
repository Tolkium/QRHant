import { Component, computed, inject, resource } from '@angular/core';
import { AdminApi } from '../../../core/backend/api';
import { AdminState } from '../admin-state';

@Component({
  selector: 'app-dashboard-page',
  template: `
    <h1 class="text-2xl font-extrabold mb-4">Dashboard</h1>

    @if (stats(); as s) {
      <div class="grid grid-cols-3 gap-3 mb-6">
        <div class="card p-4 text-center">
          <p class="text-3xl font-extrabold text-primary">{{ s.totalPlayers }}</p>
          <p class="text-sm text-muted">Players</p>
        </div>
        <div class="card p-4 text-center">
          <p class="text-3xl font-extrabold text-primary">{{ s.activePlayers24h }}</p>
          <p class="text-sm text-muted">Active (24h)</p>
        </div>
        <div class="card p-4 text-center">
          <p class="text-3xl font-extrabold text-primary">{{ s.totalFinds }}</p>
          <p class="text-sm text-muted">Total finds</p>
        </div>
      </div>

      <!-- finds per hour -->
      <section class="card p-4 mb-6">
        <h2 class="font-bold mb-3">Finds per hour</h2>
        @if (s.findsPerHour.length === 0) {
          <p class="text-muted text-sm">No finds yet.</p>
        }
        <div class="flex items-end gap-1 h-28 overflow-x-auto">
          @for (h of s.findsPerHour; track h.hour) {
            <div class="flex flex-col items-center gap-1 min-w-8" [title]="h.hour + ':00'">
              <span class="text-xs font-semibold">{{ h.count }}</span>
              <div
                class="w-6 rounded-t bg-primary"
                [style.height.px]="(h.count / maxHourly()) * 80"
              ></div>
              <span class="text-[10px] text-muted">{{ h.hour.slice(11) }}h</span>
            </div>
          }
        </div>
      </section>

      <!-- per-code counts: instantly shows badly placed codes -->
      <section class="card p-4 mb-6">
        <h2 class="font-bold mb-3">Finds per code (worst placed first)</h2>
        <div class="flex flex-col gap-1.5 max-h-72 overflow-y-auto">
          @for (c of s.perCode; track c.codeId) {
            <div class="flex items-center gap-2 text-sm">
              <span class="w-40 truncate">{{ c.title }}</span>
              <div class="flex-1 h-4 rounded bg-line overflow-hidden">
                <div
                  class="h-full bg-accent"
                  [style.width.%]="maxPerCode() ? (c.count / maxPerCode()) * 100 : 0"
                ></div>
              </div>
              <span class="w-8 text-right font-semibold">{{ c.count }}</span>
            </div>
          }
        </div>
      </section>
    }

    <!-- anomaly review -->
    <section class="card p-4">
      <h2 class="font-bold mb-3">Anomaly flags</h2>
      @if ((anomalies() ?? []).length === 0) {
        <p class="text-muted text-sm">Nothing suspicious. Good.</p>
      }
      @for (a of anomalies() ?? []; track a.id) {
        <div class="border-b border-line py-2 text-sm flex gap-3 items-baseline">
          <span class="font-bold text-bad uppercase text-xs whitespace-nowrap">{{ a.kind }}</span>
          <span class="font-semibold">{{ a.nickname }}</span>
          <span class="text-muted flex-1">{{ a.detail }}</span>
          <span class="text-xs text-muted whitespace-nowrap">
            {{ formatTime(a.createdAt) }}
          </span>
        </div>
      }
    </section>
  `,
})
export class DashboardPage {
  private readonly api = inject(AdminApi);
  private readonly state = inject(AdminState);

  private readonly statsRes = resource({
    params: () => ({ id: this.state.selected()?.id }),
    loader: async ({ params }) => (params.id ? this.api.getStats(params.id) : null),
  });
  private readonly anomaliesRes = resource({
    params: () => ({ id: this.state.selected()?.id }),
    loader: async ({ params }) => (params.id ? this.api.listAnomalies(params.id) : []),
  });

  readonly stats = computed(() => this.statsRes.value() ?? null);
  readonly anomalies = computed(() => this.anomaliesRes.value() ?? []);

  readonly maxHourly = computed(() =>
    Math.max(1, ...(this.stats()?.findsPerHour.map((h) => h.count) ?? [1])),
  );
  readonly maxPerCode = computed(() =>
    Math.max(1, ...(this.stats()?.perCode.map((c) => c.count) ?? [1])),
  );

  formatTime(iso: string): string {
    return new Date(iso).toLocaleString();
  }
}
