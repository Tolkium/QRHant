import { computed, inject, Injectable, signal } from '@angular/core';
import { matchAgainstPack } from '../crypto/pack-crypto';
import { CardContent, LocalFind, OfflinePack, PackEntry } from '../models';
import { idbGetAll, idbPut } from '../db/idb';
import { SessionStore } from './session.store';

/**
 * Device-side record of finds: what the player unlocked, when, and whether it
 * reached the server yet. Persisted per device; the server remains the source
 * of truth for the leaderboard.
 */
@Injectable({ providedIn: 'root' })
export class FindsStore {
  private readonly session = inject(SessionStore);

  private readonly _finds = signal<Map<string, LocalFind>>(new Map());

  readonly finds = this._finds.asReadonly();
  readonly foundCount = computed(() => this.mine().length);
  readonly pending = computed(() => this.mine().filter((f) => !f.synced));

  private mine(): LocalFind[] {
    const userId = this.session.user()?.id;
    return [...this._finds().values()].filter((f) => f.userId === userId);
  }

  findOf(codeId: string): LocalFind | undefined {
    const userId = this.session.user()?.id;
    const find = this._finds().get(codeId);
    return find && find.userId === userId ? find : undefined;
  }

  async load(): Promise<void> {
    const all = await idbGetAll<LocalFind>('localFinds');
    this._finds.set(new Map(all.map((f) => [f.codeId, f])));
  }

  async record(
    entry: PackEntry,
    code: string,
    content: CardContent,
    eventId: string,
  ): Promise<LocalFind | null> {
    const userId = this.session.user()?.id;
    if (!userId) return null;
    if (this.findOf(entry.id)) return null; // already found
    const find: LocalFind = {
      codeId: entry.id,
      userId,
      eventId,
      code,
      clientFoundAt: new Date().toISOString(),
      synced: false,
      content,
    };
    await idbPut('localFinds', find.codeId, find);
    this._finds.update((m) => new Map(m).set(find.codeId, find));
    return find;
  }

  async markSynced(codeIds: string[]): Promise<void> {
    const updated = new Map(this._finds());
    for (const id of codeIds) {
      const find = updated.get(id);
      if (find) {
        const next = { ...find, synced: true };
        updated.set(id, next);
        await idbPut('localFinds', id, next);
      }
    }
    this._finds.set(updated);
  }

  /** Refresh decrypted content when admin updates the pack after a find was recorded. */
  async rehydrateFromPack(pack: OfflinePack): Promise<void> {
    const userId = this.session.user()?.id;
    if (!userId) return;

    const updated = new Map(this._finds());
    let changed = false;

    for (const [codeId, find] of updated) {
      if (find.userId !== userId || find.eventId !== pack.eventId) continue;
      const match = await matchAgainstPack(find.code, pack);
      if (!match || match.entry.id !== codeId) continue;
      if (!contentChanged(find.content, match.content)) continue;
      const next: LocalFind = { ...find, content: match.content };
      updated.set(codeId, next);
      await idbPut('localFinds', codeId, next);
      changed = true;
    }

    if (changed) this._finds.set(updated);
  }
}

function contentChanged(before: CardContent, after: CardContent): boolean {
  return (
    before.title !== after.title ||
    before.image !== after.image ||
    before.art.en !== after.art.en ||
    before.art.sk !== after.art.sk ||
    before.art.cs !== after.art.cs
  );
}
