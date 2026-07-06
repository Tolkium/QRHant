import { inject, Injectable } from '@angular/core';
import { normalizeCode } from '../../../core/crypto/codec';
import { matchAgainstPack } from '../../../core/crypto/pack-crypto';
import { FindsStore } from '../../../core/stores/finds.store';
import { PackStore } from '../../../core/stores/pack.store';
import { SyncEngine } from '../../../core/sync/sync-engine';
import { LocalFind } from '../../../core/models';

export type EntryResult =
  | { kind: 'found'; find: LocalFind; milestone: boolean; all: boolean }
  | { kind: 'already-found' }
  | { kind: 'unknown' }
  | { kind: 'not-a-code' };

const MILESTONES = [10, 25, 50, 75];

/**
 * The single pipeline for both scanning and staff manual entry:
 * normalize -> one Argon2 run -> pack match -> decrypt -> record -> sync.
 */
@Injectable({ providedIn: 'root' })
export class CodeEntryService {
  private readonly pack = inject(PackStore);
  private readonly finds = inject(FindsStore);
  private readonly sync = inject(SyncEngine);

  async submit(raw: string): Promise<EntryResult> {
    const code = normalizeCode(raw);
    if (!code) return { kind: 'not-a-code' };
    const pack = this.pack.pack();
    const event = this.pack.event();
    if (!pack || !event) return { kind: 'unknown' };

    const match = await matchAgainstPack(code, pack);
    if (!match) return { kind: 'unknown' };
    if (this.finds.findOf(match.entry.id)) return { kind: 'already-found' };

    const find = await this.finds.record(match.entry, code, match.content, event.id);
    if (!find) return { kind: 'unknown' };
    void this.sync.trigger();

    const count = this.finds.foundCount();
    const total = this.pack.pack()?.entries.length ?? 0;
    return {
      kind: 'found',
      find,
      milestone: MILESTONES.includes(count),
      all: total > 0 && count === total,
    };
  }
}
