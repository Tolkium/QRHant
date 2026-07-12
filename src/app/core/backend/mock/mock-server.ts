import {
  AnomalyFlag,
  CodeRecord,
  DashboardStats,
  HuntEvent,
  LeaderboardView,
  OfflinePack,
  Profile,
  ServerFind,
  SyncResult,
  normalizeEvent,
} from '../../models';
import { idbDelete, idbGet, idbGetAll, idbPut } from '../../db/idb';
import { bytesToHex } from '../../crypto/codec';
import type { FindSubmission } from '../api';

/**
 * Simulates the future Supabase backend on-device. Everything below the API
 * boundary behaves like the real server will: finds are re-validated against
 * plaintext codes, timestamps are clamped to [last contact, arrival], sync is
 * idempotent, rate limits and anomaly flags apply. The only difference is that
 * "server state" lives in IndexedDB instead of Postgres.
 */
export class MockServer {
  // ---------- users ----------

  async getUser(id: string): Promise<Profile | undefined> {
    return idbGet<Profile>('users', id);
  }

  async listUsers(): Promise<Profile[]> {
    return idbGetAll<Profile>('users');
  }

  async findUserByNickname(nickname: string): Promise<Profile | undefined> {
    const users = await this.listUsers();
    return users.find((u) => u.nickname.toLowerCase() === nickname.toLowerCase());
  }

  async putUser(user: Profile): Promise<void> {
    await idbPut('users', user.id, user);
  }

  async putPasswordHash(userId: string, hash: string): Promise<void> {
    await idbPut('kv', `pw:${userId}`, hash);
  }

  async getPasswordHash(userId: string): Promise<string | undefined> {
    return idbGet<string>('kv', `pw:${userId}`);
  }

  static async hashPassword(password: string, userId: string): Promise<string> {
    const data = new TextEncoder().encode(`qrhunt:${userId}:${password}`);
    const digest = await crypto.subtle.digest('SHA-256', data);
    return bytesToHex(new Uint8Array(digest));
  }

  // ---------- events ----------

  async listEvents(): Promise<HuntEvent[]> {
    const all = await idbGetAll<HuntEvent & { mapImage?: string | null }>('events');
    return all.map((e) => normalizeEvent(e));
  }

  async getEvent(id: string): Promise<HuntEvent | undefined> {
    const row = await idbGet<HuntEvent & { mapImage?: string | null }>('events', id);
    return row ? normalizeEvent(row) : undefined;
  }

  async putEvent(event: HuntEvent): Promise<void> {
    await idbPut('events', event.id, event);
  }

  async getActiveEvent(): Promise<HuntEvent | null> {
    const events = await this.listEvents();
    return events.find((e) => e.active) ?? null;
  }

  async setActiveEvent(eventId: string): Promise<void> {
    const events = await this.listEvents();
    for (const e of events) {
      const shouldBeActive = e.id === eventId;
      if (e.active !== shouldBeActive) {
        await this.putEvent({ ...e, active: shouldBeActive });
      }
    }
  }

  /** Any content-affecting admin change bumps the pack version. */
  async bumpPackVersion(eventId: string): Promise<void> {
    const event = await this.getEvent(eventId);
    if (event) {
      await this.putEvent({ ...event, packVersion: event.packVersion + 1 });
    }
  }

  // ---------- codes ----------

  async listCodes(eventId: string): Promise<CodeRecord[]> {
    const all = await idbGetAll<CodeRecord>('codes');
    return all.filter((c) => c.eventId === eventId);
  }

  async putCode(code: CodeRecord): Promise<void> {
    await idbPut('codes', code.id, code);
  }

  async deleteCode(codeId: string): Promise<void> {
    await idbDelete('codes', codeId);
  }

  async buildPack(eventId: string): Promise<OfflinePack> {
    const event = await this.getEvent(eventId);
    if (!event) throw new Error('event not found');
    const codes = await this.listCodes(eventId);
    return {
      eventId,
      version: event.packVersion,
      argonSalt: event.argonSalt,
      argonParams: event.argonParams,
      entries: codes.map((c) => ({
        id: c.id,
        title: c.title,
        tag: c.tag,
        iv: c.iv,
        ciphertext: c.ciphertext,
        releaseAt: c.releaseAt,
      })),
    };
  }

  // ---------- finds & sync ----------

  async listFinds(eventId: string): Promise<ServerFind[]> {
    const all = await idbGetAll<ServerFind>('finds');
    return all.filter((f) => f.eventId === eventId);
  }

  private findKey(userId: string, codeId: string): string {
    return `${userId}:${codeId}`;
  }

  private async getLastContact(userId: string): Promise<string | null> {
    return (await idbGet<string>('kv', `contact:${userId}`)) ?? null;
  }

  private async touchContact(userId: string, iso: string): Promise<void> {
    await idbPut('kv', `contact:${userId}`, iso);
  }

  private async addAnomaly(
    flag: Omit<AnomalyFlag, 'id' | 'createdAt' | 'nickname'>,
  ): Promise<void> {
    const user = await this.getUser(flag.userId);
    const anomaly: AnomalyFlag = {
      ...flag,
      id: crypto.randomUUID(),
      nickname: user?.nickname ?? flag.userId,
      createdAt: new Date().toISOString(),
    };
    await idbPut('anomalies', anomaly.id, anomaly);
  }

  async listAnomalies(eventId: string): Promise<AnomalyFlag[]> {
    const all = await idbGetAll<AnomalyFlag>('anomalies');
    return all
      .filter((a) => a.eventId === eventId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  /** Sliding-window request rate limit, persisted in kv. */
  private async checkRequestRate(userId: string, perMinute: number): Promise<boolean> {
    const key = `rate:${userId}`;
    const now = Date.now();
    const stamps = ((await idbGet<number[]>('kv', key)) ?? []).filter((t) => now - t < 60_000);
    stamps.push(now);
    await idbPut('kv', key, stamps);
    return stamps.length <= perMinute;
  }

  private async bumpInvalidStrikes(userId: string, amount: number): Promise<number> {
    const key = `strikes:${userId}`;
    const total = ((await idbGet<number>('kv', key)) ?? 0) + amount;
    await idbPut('kv', key, total);
    return total;
  }

  /**
   * The server side of sync. Mirrors the future syncFinds Edge Function:
   * re-validate each code, clamp timestamps, enforce ordering, insert
   * idempotently, flag anomalies.
   */
  async submitFinds(
    userId: string,
    eventId: string,
    finds: FindSubmission[],
    settings: HuntEvent['huntSettings'],
  ): Promise<SyncResult> {
    const event = await this.getEvent(eventId);
    if (!event) throw new Error('event not found');
    const user = await this.getUser(userId);
    if (!user || user.banned) throw new Error('forbidden');

    const nowIso = new Date().toISOString();
    const now = Date.parse(nowIso);

    if (!(await this.checkRequestRate(userId, settings.syncRequestsPerMinute))) {
      await this.addAnomaly({
        userId,
        eventId,
        kind: 'burst-sync',
        detail: `Request rate above ${settings.syncRequestsPerMinute}/min`,
      });
      throw new Error('rate-limited');
    }

    const lastContact = await this.getLastContact(userId);
    const windowStart = lastContact ? Date.parse(lastContact) : Date.parse(event.startsAt);

    const codes = await this.listCodes(eventId);
    const byId = new Map(codes.map((c) => [c.id, c]));

    let accepted = 0;
    let duplicates = 0;
    let rejected = 0;
    let invalid = 0;
    let prevTime = 0;
    let orderViolation = false;
    let clusteredAtWindowStart = 0;

    for (const f of finds) {
      const record = byId.get(f.codeId);
      // Server-side re-validation: the plaintext code must match the record.
      if (!record || record.code !== f.code) {
        invalid++;
        rejected++;
        continue;
      }
      const key = this.findKey(userId, f.codeId);
      const existing = await idbGet<ServerFind>('finds', key);
      if (existing) {
        duplicates++; // idempotent: already recorded is success, not error
        continue;
      }
      const clientTime = Date.parse(f.clientFoundAt);
      const clamped = Math.min(Math.max(clientTime || windowStart, windowStart), now);
      if (clamped - windowStart < 60_000) clusteredAtWindowStart++;
      if (prevTime && clamped < prevTime) orderViolation = true;
      prevTime = clamped;

      const serverFind: ServerFind = {
        userId,
        codeId: f.codeId,
        eventId,
        clientFoundAt: f.clientFoundAt,
        clampedFoundAt: new Date(clamped).toISOString(),
        syncedAt: nowIso,
      };
      await idbPut('finds', key, serverFind);
      accepted++;
    }

    if (invalid > 0) {
      const strikes = await this.bumpInvalidStrikes(userId, invalid);
      if (strikes >= settings.invalidCodeStrikes) {
        await this.addAnomaly({
          userId,
          eventId,
          kind: 'invalid-codes',
          detail: `${strikes} invalid code submissions — possible API scripting`,
        });
      }
    }
    if (orderViolation) {
      await this.addAnomaly({
        userId,
        eventId,
        kind: 'clock-jump',
        detail: 'Finds in batch not in chronological order',
      });
    }
    if (clusteredAtWindowStart >= 5) {
      await this.addAnomaly({
        userId,
        eventId,
        kind: 'window-cluster',
        detail: `${clusteredAtWindowStart} finds clustered at start of offline window`,
      });
    }

    await this.touchContact(userId, nowIso);

    return {
      accepted,
      duplicates,
      rejected,
      serverTime: nowIso,
      packVersion: event.packVersion,
    };
  }

  // ---------- leaderboard ----------

  async getLeaderboard(eventId: string, viewerId: string | null): Promise<LeaderboardView> {
    const event = await this.getEvent(eventId);
    if (!event) throw new Error('event not found');
    const flags = event.leaderboardFlags;
    const finds = await this.listFinds(eventId);
    const users = await this.listUsers();
    const byUser = new Map<string, { count: number; last: string }>();
    for (const f of finds) {
      const cur = byUser.get(f.userId) ?? { count: 0, last: '' };
      cur.count++;
      if (f.clampedFoundAt > cur.last) cur.last = f.clampedFoundAt;
      byUser.set(f.userId, cur);
    }
    const rows = users
      .filter((u) => !u.banned && byUser.has(u.id))
      .map((u) => {
        const agg = byUser.get(u.id)!;
        return {
          userId: u.id,
          nickname: u.nickname,
          avatar: u.avatar,
          count: agg.count,
          lastFindAt: agg.last,
          isYou: u.id === viewerId,
          rank: 0,
        };
      })
      // most codes first; earlier last-find wins ties
      .sort((a, b) => b.count - a.count || a.lastFindAt.localeCompare(b.lastFindAt));
    rows.forEach((r, i) => (r.rank = i + 1));

    const you = rows.find((r) => r.isYou) ?? null;
    let entries = rows;
    if (!flags.visible) entries = [];
    else if (flags.topN > 0) entries = rows.slice(0, flags.topN);

    return { flags, entries, you };
  }

  // ---------- admin stats ----------

  async getStats(eventId: string): Promise<DashboardStats> {
    const finds = await this.listFinds(eventId);
    const users = await this.listUsers();
    const codes = await this.listCodes(eventId);
    const dayAgo = Date.now() - 24 * 3600_000;

    const activeUserIds = new Set(
      finds.filter((f) => Date.parse(f.syncedAt) > dayAgo).map((f) => f.userId),
    );

    const hourly = new Map<string, number>();
    for (const f of finds) {
      const hour = f.clampedFoundAt.slice(0, 13);
      hourly.set(hour, (hourly.get(hour) ?? 0) + 1);
    }

    const perCodeCount = new Map<string, number>();
    for (const f of finds) {
      perCodeCount.set(f.codeId, (perCodeCount.get(f.codeId) ?? 0) + 1);
    }

    return {
      totalPlayers: users.filter((u) => u.role === 'player').length,
      activePlayers24h: activeUserIds.size,
      totalFinds: finds.length,
      findsPerHour: [...hourly.entries()]
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([hour, count]) => ({ hour, count })),
      perCode: codes
        .map((c) => ({ codeId: c.id, title: c.title, count: perCodeCount.get(c.id) ?? 0 }))
        .sort((a, b) => a.count - b.count),
    };
  }
}
