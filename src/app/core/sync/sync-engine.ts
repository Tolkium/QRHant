import { computed, inject, Injectable, signal } from '@angular/core';
import { FindsApi } from '../backend/api';
import { FindsStore } from '../stores/finds.store';
import { PackStore } from '../stores/pack.store';

export type SyncState = 'idle' | 'syncing' | 'backoff';

const BASE_BACKOFF_MS = 5_000;
const MAX_BACKOFF_MS = 5 * 60_000;
const PERIODIC_MS = 60_000;

/**
 * Explicit single-flight state machine: idle -> syncing -> (idle | backoff).
 * Triggers: start(), browser 'online' event, successful scan, manual button,
 * periodic timer. Exponential backoff on failure.
 */
@Injectable({ providedIn: 'root' })
export class SyncEngine {
  private readonly findsApi = inject(FindsApi);
  private readonly finds = inject(FindsStore);
  private readonly pack = inject(PackStore);

  private readonly _state = signal<SyncState>('idle');
  private readonly _lastSyncAt = signal<string | null>(
    localStorage.getItem('qrhunt.lastSync'),
  );
  private readonly _online = signal(navigator.onLine);

  readonly state = this._state.asReadonly();
  readonly lastSyncAt = this._lastSyncAt.asReadonly();
  readonly online = this._online.asReadonly();
  readonly pendingCount = computed(() => this.finds.pending().length);

  private inFlight = false;
  private backoffMs = BASE_BACKOFF_MS;
  private backoffTimer: ReturnType<typeof setTimeout> | null = null;
  private started = false;

  start(): void {
    if (this.started) return;
    this.started = true;
    window.addEventListener('online', () => {
      this._online.set(true);
      void this.trigger();
    });
    window.addEventListener('offline', () => this._online.set(false));
    setInterval(() => void this.trigger(), PERIODIC_MS);
    void this.trigger();
  }

  /** Single-flight entry point; safe to call from anywhere, any time. */
  async trigger(): Promise<void> {
    if (this.inFlight || !navigator.onLine) return;
    const pending = this.finds.pending();
    const event = this.pack.event();
    if (!event) return;
    if (pending.length === 0) {
      // Nothing to push — still a cheap chance to catch pack updates.
      void this.pack.refresh();
      return;
    }

    this.inFlight = true;
    this._state.set('syncing');
    try {
      const result = await this.findsApi.submitFinds(
        event.id,
        pending.map((f) => ({
          codeId: f.codeId,
          code: f.code,
          clientFoundAt: f.clientFoundAt,
        })),
      );
      // accepted and duplicates are both "server knows about it" -> synced
      await this.finds.markSynced(pending.map((f) => f.codeId));
      const now = new Date().toISOString();
      this._lastSyncAt.set(now);
      localStorage.setItem('qrhunt.lastSync', now);
      this.backoffMs = BASE_BACKOFF_MS;
      this._state.set('idle');
      if (result.packVersion > (this.pack.pack()?.version ?? 0)) {
        void this.pack.refresh();
      }
    } catch {
      this._state.set('backoff');
      this.scheduleRetry();
    } finally {
      this.inFlight = false;
    }
  }

  private scheduleRetry(): void {
    if (this.backoffTimer) clearTimeout(this.backoffTimer);
    this.backoffTimer = setTimeout(() => {
      this.backoffTimer = null;
      void this.trigger();
    }, this.backoffMs);
    this.backoffMs = Math.min(this.backoffMs * 2, MAX_BACKOFF_MS);
  }
}
