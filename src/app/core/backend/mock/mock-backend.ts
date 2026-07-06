import { Injectable } from '@angular/core';
import {
  AdminApi,
  AuthApi,
  BulkGenerateRequest,
  CodesApi,
  Credentials,
  FindsApi,
  FindSubmission,
  LeaderboardApi,
} from '../api';
import {
  AnomalyFlag,
  CodeRecord,
  DashboardStats,
  DEFAULT_SETTINGS,
  HuntEvent,
  LeaderboardView,
  OfflinePack,
  Profile,
  ServerFind,
  SyncResult,
} from '../../models';
import { MockServer } from './mock-server';
import { seedIfNeeded } from './seed';
import { generateCode } from '../../crypto/codec';
import { deriveCode, encryptContent } from '../../crypto/pack-crypto';

const SESSION_KEY = 'qrhunt.session';

/**
 * On-device implementation of the backend boundary. A thin "network" layer
 * over MockServer: it owns the session, seeds demo data on first use, and is
 * swapped for SupabaseBackend by a DI provider switch.
 */
@Injectable({ providedIn: 'root' })
export class MockBackendService {
  private readonly server = new MockServer();
  private ready: Promise<void> | null = null;
  private currentUserId: string | null = null;

  private init(): Promise<void> {
    this.ready ??= seedIfNeeded(this.server);
    return this.ready;
  }

  private requireUser(): string {
    if (!this.currentUserId) throw new Error('not authenticated');
    return this.currentUserId;
  }

  // ---------- AuthApi ----------

  async restoreSession(): Promise<Profile | null> {
    await this.init();
    const userId = localStorage.getItem(SESSION_KEY);
    if (!userId) return null;
    const user = await this.server.getUser(userId);
    if (!user || user.banned) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
    this.currentUserId = user.id;
    return user;
  }

  async register(creds: Credentials): Promise<Profile> {
    await this.init();
    const nickname = creds.nickname.trim();
    if (!nickname || !creds.password) throw new Error('required');
    if (creds.password.length < 6) throw new Error('short-password');
    if (await this.server.findUserByNickname(nickname)) throw new Error('nickname-taken');
    const user: Profile = {
      id: crypto.randomUUID(),
      nickname,
      email: creds.email?.trim() || undefined,
      avatar: 'fox',
      language: creds.language ?? 'en',
      role: 'player',
      banned: false,
      createdAt: new Date().toISOString(),
    };
    await this.server.putUser(user);
    await this.server.putPasswordHash(
      user.id,
      await MockServer.hashPassword(creds.password, user.id),
    );
    this.currentUserId = user.id;
    localStorage.setItem(SESSION_KEY, user.id);
    return user;
  }

  async login(creds: Credentials): Promise<Profile> {
    await this.init();
    const user = await this.server.findUserByNickname(creds.nickname.trim());
    if (!user) throw new Error('invalid');
    const hash = await MockServer.hashPassword(creds.password, user.id);
    if (hash !== (await this.server.getPasswordHash(user.id))) throw new Error('invalid');
    if (user.banned) throw new Error('banned');
    this.currentUserId = user.id;
    localStorage.setItem(SESSION_KEY, user.id);
    return user;
  }

  async logout(): Promise<void> {
    this.currentUserId = null;
    localStorage.removeItem(SESSION_KEY);
  }

  async updateProfile(patch: Partial<Pick<Profile, 'avatar' | 'language'>>): Promise<Profile> {
    await this.init();
    const user = await this.server.getUser(this.requireUser());
    if (!user) throw new Error('not authenticated');
    const updated = { ...user, ...patch };
    await this.server.putUser(updated);
    return updated;
  }

  // ---------- CodesApi ----------

  async getActiveEvent(): Promise<HuntEvent | null> {
    await this.init();
    return this.server.getActiveEvent();
  }

  async getPack(eventId: string): Promise<OfflinePack> {
    await this.init();
    return this.server.buildPack(eventId);
  }

  async getPackVersion(eventId: string): Promise<number> {
    await this.init();
    return (await this.server.getEvent(eventId))?.packVersion ?? 0;
  }

  // ---------- FindsApi ----------

  async submitFinds(eventId: string, finds: FindSubmission[]): Promise<SyncResult> {
    await this.init();
    const event = await this.server.getEvent(eventId);
    return this.server.submitFinds(
      this.requireUser(),
      eventId,
      finds,
      event?.huntSettings ?? DEFAULT_SETTINGS,
    );
  }

  // ---------- LeaderboardApi ----------

  async getLeaderboard(eventId: string): Promise<LeaderboardView> {
    await this.init();
    return this.server.getLeaderboard(eventId, this.currentUserId);
  }

  // ---------- AdminApi ----------

  private async requireAdmin(): Promise<void> {
    const user = await this.server.getUser(this.requireUser());
    if (user?.role !== 'admin') throw new Error('forbidden');
  }

  async listEvents(): Promise<HuntEvent[]> {
    await this.init();
    await this.requireAdmin();
    return this.server.listEvents();
  }

  async createEvent(name: string): Promise<HuntEvent> {
    await this.init();
    await this.requireAdmin();
    const { DEFAULT_THEME, DEFAULT_FLAGS, DEFAULT_ARGON } = await import('../../models');
    const { newArgonSalt } = await import('../../crypto/pack-crypto');
    const now = Date.now();
    const event: HuntEvent = {
      id: crypto.randomUUID(),
      name,
      startsAt: new Date(now).toISOString(),
      endsAt: new Date(now + 3 * 24 * 3600_000).toISOString(),
      state: 'setup',
      active: false,
      theme: { ...DEFAULT_THEME, eventName: name, logoText: name },
      leaderboardFlags: { ...DEFAULT_FLAGS },
      huntSettings: { ...DEFAULT_SETTINGS },
      maps: [],
      packVersion: 1,
      argonSalt: newArgonSalt(),
      argonParams: { ...DEFAULT_ARGON },
    };
    await this.server.putEvent(event);
    return event;
  }

  async updateEvent(event: HuntEvent): Promise<HuntEvent> {
    await this.init();
    await this.requireAdmin();
    await this.server.putEvent(event);
    return event;
  }

  async setActiveEvent(eventId: string): Promise<void> {
    await this.init();
    await this.requireAdmin();
    await this.server.setActiveEvent(eventId);
  }

  async listCodes(eventId: string): Promise<CodeRecord[]> {
    await this.init();
    await this.requireAdmin();
    return this.server.listCodes(eventId);
  }

  async bulkGenerateCodes(eventId: string, req: BulkGenerateRequest): Promise<CodeRecord[]> {
    await this.init();
    await this.requireAdmin();
    const event = await this.server.getEvent(eventId);
    if (!event) throw new Error('event not found');
    const existing = await this.server.listCodes(eventId);
    const existingPlaintexts = new Set(existing.map((c) => c.code));
    const created: CodeRecord[] = [];
    for (let i = 0; i < req.count; i++) {
      let plaintext = generateCode();
      while (existingPlaintexts.has(plaintext)) plaintext = generateCode();
      existingPlaintexts.add(plaintext);
      const title = `${req.titlePrefix} ${existing.length + i + 1}`;
      const content = { title, art: { en: '', sk: '', cs: '' } };
      const { tag, key } = await deriveCode(plaintext, event.argonSalt, event.argonParams);
      const { iv, ciphertext } = await encryptContent(content, key);
      const record: CodeRecord = {
        id: crypto.randomUUID(),
        eventId,
        code: plaintext,
        title,
        art: { en: '', sk: '', cs: '' },
        image: null,
        mapId: null,
        mapX: null,
        mapY: null,
        mapNote: null,
        releaseAt: null,
        createdAt: new Date().toISOString(),
        tag,
        iv,
        ciphertext,
      };
      await this.server.putCode(record);
      created.push(record);
    }
    await this.server.bumpPackVersion(eventId);
    return created;
  }

  async updateCode(code: CodeRecord): Promise<CodeRecord> {
    await this.init();
    await this.requireAdmin();
    const event = await this.server.getEvent(code.eventId);
    if (!event) throw new Error('event not found');
    // Re-encrypt content since title/art/image may have changed
    const { key } = await deriveCode(code.code, event.argonSalt, event.argonParams);
    const { iv, ciphertext } = await encryptContent(
      { title: code.title, art: code.art, image: code.image ?? undefined },
      key,
    );
    const updated = { ...code, iv, ciphertext };
    await this.server.putCode(updated);
    await this.server.bumpPackVersion(code.eventId);
    return updated;
  }

  async deleteCode(codeId: string): Promise<void> {
    await this.init();
    await this.requireAdmin();
    const all = await this.server.listCodes((await this.server.getActiveEvent())?.id ?? '');
    const record = all.find((c) => c.id === codeId);
    await this.server.deleteCode(codeId);
    if (record) await this.server.bumpPackVersion(record.eventId);
  }

  async listPlayers(): Promise<Profile[]> {
    await this.init();
    await this.requireAdmin();
    return (await this.server.listUsers()).filter((u) => u.role === 'player');
  }

  async setBanned(userId: string, banned: boolean): Promise<void> {
    await this.init();
    await this.requireAdmin();
    const user = await this.server.getUser(userId);
    if (user) await this.server.putUser({ ...user, banned });
  }

  async resetPassword(userId: string, newPassword: string): Promise<void> {
    await this.init();
    await this.requireAdmin();
    await this.server.putPasswordHash(
      userId,
      await MockServer.hashPassword(newPassword, userId),
    );
  }

  async getStats(eventId: string): Promise<DashboardStats> {
    await this.init();
    await this.requireAdmin();
    return this.server.getStats(eventId);
  }

  async listAnomalies(eventId: string): Promise<AnomalyFlag[]> {
    await this.init();
    await this.requireAdmin();
    return this.server.listAnomalies(eventId);
  }

  async listFinds(eventId: string): Promise<ServerFind[]> {
    await this.init();
    await this.requireAdmin();
    return this.server.listFinds(eventId);
  }
}

/** DI adapters binding the abstract APIs to the mock implementation. */

@Injectable()
export class MockAuthApi extends AuthApi {
  constructor(private backend: MockBackendService) {
    super();
  }
  restoreSession = () => this.backend.restoreSession();
  register = (c: Credentials) => this.backend.register(c);
  login = (c: Credentials) => this.backend.login(c);
  logout = () => this.backend.logout();
  updateProfile = (p: Partial<Pick<Profile, 'avatar' | 'language'>>) =>
    this.backend.updateProfile(p);
}

@Injectable()
export class MockCodesApi extends CodesApi {
  constructor(private backend: MockBackendService) {
    super();
  }
  getActiveEvent = () => this.backend.getActiveEvent();
  getPack = (eventId: string) => this.backend.getPack(eventId);
  getPackVersion = (eventId: string) => this.backend.getPackVersion(eventId);
}

@Injectable()
export class MockFindsApi extends FindsApi {
  constructor(private backend: MockBackendService) {
    super();
  }
  submitFinds = (eventId: string, finds: FindSubmission[]) =>
    this.backend.submitFinds(eventId, finds);
}

@Injectable()
export class MockLeaderboardApi extends LeaderboardApi {
  constructor(private backend: MockBackendService) {
    super();
  }
  getLeaderboard = (eventId: string) => this.backend.getLeaderboard(eventId);
}

@Injectable()
export class MockAdminApi extends AdminApi {
  constructor(private backend: MockBackendService) {
    super();
  }
  listEvents = () => this.backend.listEvents();
  createEvent = (name: string) => this.backend.createEvent(name);
  updateEvent = (e: HuntEvent) => this.backend.updateEvent(e);
  setActiveEvent = (id: string) => this.backend.setActiveEvent(id);
  listCodes = (eventId: string) => this.backend.listCodes(eventId);
  bulkGenerateCodes = (eventId: string, req: BulkGenerateRequest) =>
    this.backend.bulkGenerateCodes(eventId, req);
  updateCode = (c: CodeRecord) => this.backend.updateCode(c);
  deleteCode = (id: string) => this.backend.deleteCode(id);
  listPlayers = () => this.backend.listPlayers();
  setBanned = (userId: string, banned: boolean) => this.backend.setBanned(userId, banned);
  resetPassword = (userId: string, pw: string) => this.backend.resetPassword(userId, pw);
  getStats = (eventId: string) => this.backend.getStats(eventId);
  listAnomalies = (eventId: string) => this.backend.listAnomalies(eventId);
  listFinds = (eventId: string) => this.backend.listFinds(eventId);
}
