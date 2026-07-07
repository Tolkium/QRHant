import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AdminState } from './admin-state';
import { SessionStore } from '../../core/stores/session.store';
import { environment } from '../../../environments/environment';

const NAV = [
  ['dashboard', 'Dashboard', '📊'],
  ['events', 'Events', '🎪'],
  ['codes', 'Codes', '🔡'],
  ['map', 'Map', '🗺️'],
  ['leaderboard', 'Leaderboard', '🏆'],
  ['players', 'Players', '👥'],
  ['settings', 'Settings', '⚙️'],
] as const;

@Component({
  selector: 'app-admin-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, FormsModule],
  template: `
    <div class="min-h-dvh md:flex">
      <!-- mobile top bar -->
      <header
        class="md:hidden sticky top-0 z-20 flex items-center justify-between bg-surface border-b border-line px-4 py-2"
      >
        <button class="text-2xl px-2" (click)="menuOpen.set(!menuOpen())" aria-label="Menu">
          ☰
        </button>
        <span class="font-extrabold flex items-center gap-1.5">
          Admin
          @if (deployLabel) {
            <span
              class="text-[10px] font-bold uppercase tracking-wide text-muted border border-line rounded px-1 py-px"
            >
              {{ deployLabel }}
            </span>
          }
        </span>
        <button class="text-sm text-primary font-semibold" (click)="logout()">Log out</button>
      </header>

      <!-- sidebar -->
      <aside
        class="bg-surface border-r border-line w-64 shrink-0 p-4 flex-col gap-1
          md:flex md:sticky md:top-0 md:h-dvh"
        [class.hidden]="!menuOpen()"
        [class.flex]="menuOpen()"
      >
        <p class="font-extrabold text-lg mb-2 hidden md:flex items-center gap-1.5">
          QR Hunt Admin
          @if (deployLabel) {
            <span
              class="text-[10px] font-bold uppercase tracking-wide text-muted border border-line rounded px-1 py-px"
            >
              {{ deployLabel }}
            </span>
          }
        </p>

        <!-- event switcher -->
        <label class="label" for="event-switcher">Event</label>
        <select
          id="event-switcher"
          class="input mb-3"
          [ngModel]="state.selected()?.id"
          (ngModelChange)="state.select($event)"
        >
          @for (e of state.events(); track e.id) {
            <option [value]="e.id">{{ e.name }}{{ e.active ? ' ●' : '' }}</option>
          }
        </select>

        @for (item of nav; track item[0]) {
          <a
            [routerLink]="item[0]"
            routerLinkActive="!bg-primary !text-primary-ink"
            class="rounded-xl px-4 py-2.5 font-semibold text-ink flex gap-2 items-center"
            (click)="menuOpen.set(false)"
          >
            <span>{{ item[2] }}</span>{{ item[1] }}
          </a>
        }

        <div class="flex-1"></div>
        <button class="btn-ghost hidden md:flex" (click)="logout()">Log out</button>
      </aside>

      <main class="flex-1 p-4 md:p-8 max-w-5xl">
        <router-outlet />
      </main>
    </div>
  `,
})
export class AdminShell implements OnInit {
  readonly deployLabel = environment.deployLabel;
  readonly state = inject(AdminState);
  private readonly session = inject(SessionStore);
  private readonly router = inject(Router);

  readonly nav = NAV;
  readonly menuOpen = signal(false);

  ngOnInit(): void {
    void this.state.load();
  }

  async logout(): Promise<void> {
    await this.session.logout();
    await this.router.navigate(['/auth']);
  }
}
