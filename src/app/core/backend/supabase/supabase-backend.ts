import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
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
  HuntEvent,
  LeaderboardView,
  OfflinePack,
  Profile,
  ServerFind,
  SyncResult,
  normalizeEvent,
} from '../../models';
import { deriveCode, encryptContent } from '../../crypto/pack-crypto';
import { normalizeThemeConfig } from '../../themes/theme-utils';
import { environment } from '../../../../environments/environment';

/**
 * Production backend. Same interfaces as the mock; bound in app.config.ts by
 * setting environment.backend = 'supabase' (plus URL + anon key).
 *
 * Nickname-only accounts use a synthetic e-mail (<nickname>@player.qrhunt.app)
 * because Supabase Auth is e-mail-based; a player-provided recovery e-mail is
 * stored on the profile. Supabase persists the session in localStorage with
 * auto-refresh, which gives us the festival-long login for free.
 */

const PROFILE_CACHE = 'qrhunt.profile';

function syntheticEmail(nickname: string): string {
  return `${nickname.trim().toLowerCase()}@player.qrhunt.app`;
}

function eventFromRow(row: Record<string, unknown>): HuntEvent {
  return normalizeEvent({
    id: row['id'] as string,
    name: row['name'] as string,
    startsAt: row['starts_at'] as string,
    endsAt: row['ends_at'] as string,
    state: row['state'] as HuntEvent['state'],
    active: row['active'] as boolean,
    theme: normalizeThemeConfig(row['theme'], row['name'] as string),
    leaderboardFlags: row['leaderboard_flags'] as HuntEvent['leaderboardFlags'],
    huntSettings: row['hunt_settings'] as HuntEvent['huntSettings'],
    maps: (row['maps'] as HuntEvent['maps']) ?? [],
    mapImage: row['map_image'] as string | null | undefined,
    packVersion: row['pack_version'] as number,
    argonSalt: row['argon_salt'] as string,
    argonParams: row['argon_params'] as HuntEvent['argonParams'],
  });
}

function eventToRow(event: HuntEvent): Record<string, unknown> {
  return {
    id: event.id,
    name: event.name,
    starts_at: event.startsAt,
    ends_at: event.endsAt,
    state: event.state,
    active: event.active,
    theme: event.theme,
    leaderboard_flags: event.leaderboardFlags,
    hunt_settings: event.huntSettings,
    maps: event.maps,
    pack_version: event.packVersion,
    argon_salt: event.argonSalt,
    argon_params: event.argonParams,
  };
}

function codeFromRow(row: Record<string, unknown>): CodeRecord {
  return {
    id: row['id'] as string,
    eventId: row['event_id'] as string,
    code: row['code'] as string,
    title: row['title'] as string,
    art: row['art'] as CodeRecord['art'],
    image: (row['image'] as string | null) ?? null,
    mapId: (row['map_id'] as string | null) ?? null,
    mapX: row['map_x'] as number | null,
    mapY: row['map_y'] as number | null,
    mapNote: (row['map_note'] as string | null) ?? null,
    releaseAt: row['release_at'] as string | null,
    createdAt: row['created_at'] as string,
    tag: row['tag'] as string,
    iv: row['iv'] as string,
    ciphertext: row['ciphertext'] as string,
  };
}

@Injectable({ providedIn: 'root' })
export class SupabaseBackendService {
  readonly client: SupabaseClient = createClient(
    environment.supabaseUrl,
    environment.supabaseAnonKey,
  );

  // ---------- AuthApi ----------

  async restoreSession(): Promise<Profile | null> {
    // getSession reads localStorage — no network, so offline restore works
    const { data } = await this.client.auth.getSession();
    if (!data.session) return null;
    try {
      const profile = await this.fetchProfile(data.session.user.id);
      localStorage.setItem(PROFILE_CACHE, JSON.stringify(profile));
      return profile;
    } catch {
      // offline: fall back to the cached profile so the shell is never gated
      const cached = localStorage.getItem(PROFILE_CACHE);
      if (!cached) return null;
      const parsed = JSON.parse(cached) as Profile;
      return { ...parsed, preferredThemeId: parsed.preferredThemeId ?? null };
    }
  }

  private async fetchProfile(userId: string): Promise<Profile> {
    const { data, error } = await this.client
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    if (error || !data) throw new Error('profile-missing');
    if (data.banned) throw new Error('banned');
    return {
      id: data.id,
      nickname: data.nickname,
      avatar: data.avatar,
      language: data.language,
      preferredThemeId: data.preferred_theme_id ?? null,
      role: data.role,
      banned: data.banned,
      createdAt: data.created_at,
    };
  }

  async register(creds: Credentials): Promise<Profile> {
    if (creds.password.length < 6) throw new Error('short-password');
    const nickname = creds.nickname.trim();
    const { data, error } = await this.client.auth.signUp({
      email: syntheticEmail(nickname),
      password: creds.password,
      options: {
        data: { nickname, language: creds.language ?? 'en' },
      },
    });
    if (error || !data.user) {
      throw new Error(error?.message.includes('already') ? 'nickname-taken' : 'register-failed');
    }

    // Ensure we have a session (email confirm must be off in Supabase dashboard).
    if (!data.session) {
      const { error: loginError } = await this.client.auth.signInWithPassword({
        email: syntheticEmail(nickname),
        password: creds.password,
      });
      if (loginError) throw new Error('register-failed');
    }

    // Profile row is created by DB trigger; upsert covers older projects without it.
    const { error: profileError } = await this.client.from('profiles').upsert(
      {
        id: data.user.id,
        nickname,
        language: creds.language ?? 'en',
      },
      { onConflict: 'id', ignoreDuplicates: true },
    );
    if (profileError && profileError.code !== '23505') {
      throw new Error(profileError.code === '23505' ? 'nickname-taken' : 'register-failed');
    }
    const profile = await this.fetchProfile(data.user.id);
    localStorage.setItem(PROFILE_CACHE, JSON.stringify(profile));
    return profile;
  }

  async login(creds: Credentials): Promise<Profile> {
    const { data, error } = await this.client.auth.signInWithPassword({
      email: syntheticEmail(creds.nickname),
      password: creds.password,
    });
    if (error || !data.user) throw new Error('login-failed');

    // Admin TOTP 2FA: when an authenticator is enrolled, password alone gives
    // aal1 and the caller must complete a TOTP challenge via verifyTotp().
    const { data: aal } = await this.client.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aal && aal.nextLevel === 'aal2' && aal.nextLevel !== aal.currentLevel) {
      throw new Error('mfa-required');
    }
    const profile = await this.fetchProfile(data.user.id);
    localStorage.setItem(PROFILE_CACHE, JSON.stringify(profile));
    return profile;
  }

  /** Complete a pending TOTP challenge (admin accounts). */
  async verifyTotp(code: string): Promise<Profile> {
    const { data: factors } = await this.client.auth.mfa.listFactors();
    const totp = factors?.totp?.[0];
    if (!totp) throw new Error('invalid');
    const { error } = await this.client.auth.mfa.challengeAndVerify({
      factorId: totp.id,
      code,
    });
    if (error) throw new Error('invalid');
    const { data } = await this.client.auth.getUser();
    return this.fetchProfile(data.user!.id);
  }

  /** Enroll TOTP for the current (admin) user; returns the QR/secret to show. */
  async enrollTotp(): Promise<{ qrCode: string; secret: string; factorId: string }> {
    const { data, error } = await this.client.auth.mfa.enroll({ factorType: 'totp' });
    if (error || !data) throw new Error(error?.message ?? 'enroll failed');
    return {
      qrCode: data.totp.qr_code,
      secret: data.totp.secret,
      factorId: data.id,
    };
  }

  async logout(): Promise<void> {
    localStorage.removeItem(PROFILE_CACHE);
    await this.client.auth.signOut();
  }

  async updateProfile(
    patch: Partial<Pick<Profile, 'avatar' | 'language' | 'preferredThemeId'>>,
  ): Promise<Profile> {
    const { data } = await this.client.auth.getUser();
    if (!data.user) throw new Error('not authenticated');
    const row: Record<string, unknown> = {};
    if (patch.avatar !== undefined) row['avatar'] = patch.avatar;
    if (patch.language !== undefined) row['language'] = patch.language;
    if (patch.preferredThemeId !== undefined) row['preferred_theme_id'] = patch.preferredThemeId;
    const { error } = await this.client.from('profiles').update(row).eq('id', data.user.id);
    if (error) throw new Error(error.message);
    const profile = await this.fetchProfile(data.user.id);
    localStorage.setItem(PROFILE_CACHE, JSON.stringify(profile));
    return profile;
  }

  // ---------- CodesApi ----------

  async getActiveEvent(): Promise<HuntEvent | null> {
    const { data, error } = await this.client
      .from('events')
      .select('*')
      .eq('active', true)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data ? eventFromRow(data) : null;
  }

  async getPack(eventId: string): Promise<OfflinePack> {
    const { data, error } = await this.client.rpc('get_pack', { p_event_id: eventId });
    if (error || !data) throw new Error(error?.message ?? 'pack unavailable');
    return data as OfflinePack;
  }

  async getPackVersion(eventId: string): Promise<number> {
    const { data } = await this.client
      .from('events')
      .select('pack_version')
      .eq('id', eventId)
      .single();
    return data?.pack_version ?? 0;
  }

  // ---------- FindsApi ----------

  async submitFinds(eventId: string, finds: FindSubmission[]): Promise<SyncResult> {
    const { data, error } = await this.client.functions.invoke('sync-finds', {
      body: { eventId, finds },
    });
    if (error) throw new Error(error.message);
    return data as SyncResult;
  }

  // ---------- LeaderboardApi ----------

  async getLeaderboard(eventId: string): Promise<LeaderboardView> {
    const { data, error } = await this.client.rpc('get_leaderboard', {
      p_event_id: eventId,
    });
    if (error || !data) throw new Error(error?.message ?? 'leaderboard unavailable');
    return data as LeaderboardView;
  }

  subscribeFinds(eventId: string, onChange: () => void): () => void {
    const channel = this.client
      .channel(`finds-${eventId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'finds', filter: `event_id=eq.${eventId}` },
        onChange,
      )
      .subscribe();
    return () => void this.client.removeChannel(channel);
  }

  // ---------- AdminApi ----------

  async listEvents(): Promise<HuntEvent[]> {
    const { data, error } = await this.client.from('events').select('*').order('starts_at');
    if (error) throw new Error(error.message);
    return (data ?? []).map(eventFromRow);
  }

  async createEvent(name: string): Promise<HuntEvent> {
    const { DEFAULT_FLAGS, DEFAULT_SETTINGS, DEFAULT_ARGON } = await import('../../models');
    const { defaultThemeConfig } = await import('../../themes/theme-utils');
    const { newArgonSalt } = await import('../../crypto/pack-crypto');
    const now = Date.now();
    const row = {
      name,
      starts_at: new Date(now).toISOString(),
      ends_at: new Date(now + 3 * 24 * 3600_000).toISOString(),
      theme: defaultThemeConfig(name, name),
      leaderboard_flags: DEFAULT_FLAGS,
      hunt_settings: DEFAULT_SETTINGS,
      argon_salt: newArgonSalt(),
      argon_params: DEFAULT_ARGON,
    };
    const { data, error } = await this.client.from('events').insert(row).select().single();
    if (error || !data) throw new Error(error?.message ?? 'create failed');
    return eventFromRow(data);
  }

  async updateEvent(event: HuntEvent): Promise<HuntEvent> {
    const { error } = await this.client
      .from('events')
      .update(eventToRow(event))
      .eq('id', event.id);
    if (error) throw new Error(error.message);
    return event;
  }

  async setActiveEvent(eventId: string): Promise<void> {
    await this.client.from('events').update({ active: false }).eq('active', true);
    const { error } = await this.client
      .from('events')
      .update({ active: true })
      .eq('id', eventId);
    if (error) throw new Error(error.message);
  }

  async listCodes(eventId: string): Promise<CodeRecord[]> {
    const { data, error } = await this.client
      .from('codes')
      .select('*')
      .eq('event_id', eventId)
      .order('created_at');
    if (error) throw new Error(error.message);
    return (data ?? []).map(codeFromRow);
  }

  async bulkGenerateCodes(eventId: string, req: BulkGenerateRequest): Promise<CodeRecord[]> {
    const { error } = await this.client.functions.invoke('generate-codes', {
      body: { eventId, count: req.count, titlePrefix: req.titlePrefix },
    });
    if (error) throw new Error(error.message);
    return this.listCodes(eventId);
  }

  async updateCode(code: CodeRecord): Promise<CodeRecord> {
    // Admin edits change the card content -> re-encrypt in the browser using
    // the same client-side crypto module the scanner uses.
    const { data: eventRow } = await this.client
      .from('events')
      .select('argon_salt, argon_params, pack_version')
      .eq('id', code.eventId)
      .single();
    if (!eventRow) throw new Error('event not found');
    const { key } = await deriveCode(code.code, eventRow.argon_salt, eventRow.argon_params);
    const { iv, ciphertext } = await encryptContent(
      { title: code.title, art: code.art, image: code.image ?? undefined },
      key,
    );

    const { error } = await this.client
      .from('codes')
      .update({
        title: code.title,
        art: code.art,
        image: code.image,
        map_id: code.mapId,
        map_x: code.mapX,
        map_y: code.mapY,
        map_note: code.mapNote,
        release_at: code.releaseAt,
        iv,
        ciphertext,
      })
      .eq('id', code.id);
    if (error) throw new Error(error.message);

    await this.client
      .from('events')
      .update({ pack_version: eventRow.pack_version + 1 })
      .eq('id', code.eventId);
    return { ...code, iv, ciphertext };
  }

  async deleteCode(codeId: string): Promise<void> {
    const { data } = await this.client
      .from('codes')
      .select('event_id')
      .eq('id', codeId)
      .single();
    const { error } = await this.client.from('codes').delete().eq('id', codeId);
    if (error) throw new Error(error.message);
    if (data) {
      const { data: ev } = await this.client
        .from('events')
        .select('pack_version')
        .eq('id', data.event_id)
        .single();
      if (ev) {
        await this.client
          .from('events')
          .update({ pack_version: ev.pack_version + 1 })
          .eq('id', data.event_id);
      }
    }
  }

  async listPlayers(): Promise<Profile[]> {
    const { data, error } = await this.client
      .from('profiles')
      .select('*')
      .eq('role', 'player')
      .order('nickname');
    if (error) throw new Error(error.message);
    return (data ?? []).map((row) => ({
      id: row.id,
      nickname: row.nickname,
      avatar: row.avatar,
      language: row.language,
      preferredThemeId: row.preferred_theme_id ?? null,
      role: row.role,
      banned: row.banned,
      createdAt: row.created_at,
    }));
  }

  async setBanned(userId: string, banned: boolean): Promise<void> {
    const { error } = await this.client.from('profiles').update({ banned }).eq('id', userId);
    if (error) throw new Error(error.message);
  }

  async resetPassword(userId: string, newPassword: string): Promise<void> {
    const { error } = await this.client.functions.invoke('admin-reset-password', {
      body: { userId, newPassword },
    });
    if (error) throw new Error(error.message);
  }

  async getStats(eventId: string): Promise<DashboardStats> {
    const [{ data: finds }, { data: players }, { data: codes }] = await Promise.all([
      this.client.from('finds').select('user_id, code_id, clamped_found_at, synced_at').eq('event_id', eventId),
      this.client.from('profiles').select('id').eq('role', 'player'),
      this.client.from('codes').select('id, title').eq('event_id', eventId),
    ]);
    const allFinds = finds ?? [];
    const dayAgo = Date.now() - 24 * 3600_000;

    const hourly = new Map<string, number>();
    const perCodeCount = new Map<string, number>();
    const active = new Set<string>();
    for (const f of allFinds) {
      const hour = (f.clamped_found_at as string).slice(0, 13);
      hourly.set(hour, (hourly.get(hour) ?? 0) + 1);
      perCodeCount.set(f.code_id, (perCodeCount.get(f.code_id) ?? 0) + 1);
      if (Date.parse(f.synced_at) > dayAgo) active.add(f.user_id);
    }
    return {
      totalPlayers: players?.length ?? 0,
      activePlayers24h: active.size,
      totalFinds: allFinds.length,
      findsPerHour: [...hourly.entries()]
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([hour, count]) => ({ hour, count })),
      perCode: (codes ?? [])
        .map((c) => ({ codeId: c.id, title: c.title, count: perCodeCount.get(c.id) ?? 0 }))
        .sort((a, b) => a.count - b.count),
    };
  }

  async listAnomalies(eventId: string): Promise<AnomalyFlag[]> {
    const { data, error } = await this.client
      .from('anomalies')
      .select('*, profiles(nickname)')
      .eq('event_id', eventId)
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map((row) => ({
      id: row.id,
      userId: row.user_id,
      nickname: (row.profiles as { nickname: string } | null)?.nickname ?? row.user_id,
      eventId: row.event_id,
      kind: row.kind,
      detail: row.detail,
      createdAt: row.created_at,
    }));
  }

  async listFinds(eventId: string): Promise<ServerFind[]> {
    const { data, error } = await this.client.from('finds').select('*').eq('event_id', eventId);
    if (error) throw new Error(error.message);
    return (data ?? []).map((row) => ({
      userId: row.user_id,
      codeId: row.code_id,
      eventId: row.event_id,
      clientFoundAt: row.client_found_at,
      clampedFoundAt: row.clamped_found_at,
      syncedAt: row.synced_at,
    }));
  }
}

/** DI adapters, mirroring the mock ones. */

@Injectable()
export class SupabaseAuthApi extends AuthApi {
  constructor(private backend: SupabaseBackendService) {
    super();
  }
  restoreSession = () => this.backend.restoreSession();
  register = (c: Credentials) => this.backend.register(c);
  login = (c: Credentials) => this.backend.login(c);
  logout = () => this.backend.logout();
  updateProfile = (p: Partial<Pick<Profile, 'avatar' | 'language' | 'preferredThemeId'>>) =>
    this.backend.updateProfile(p);
}

@Injectable()
export class SupabaseCodesApi extends CodesApi {
  constructor(private backend: SupabaseBackendService) {
    super();
  }
  getActiveEvent = () => this.backend.getActiveEvent();
  getPack = (eventId: string) => this.backend.getPack(eventId);
  getPackVersion = (eventId: string) => this.backend.getPackVersion(eventId);
}

@Injectable()
export class SupabaseFindsApi extends FindsApi {
  constructor(private backend: SupabaseBackendService) {
    super();
  }
  submitFinds = (eventId: string, finds: FindSubmission[]) =>
    this.backend.submitFinds(eventId, finds);
}

@Injectable()
export class SupabaseLeaderboardApi extends LeaderboardApi {
  constructor(private backend: SupabaseBackendService) {
    super();
  }
  getLeaderboard = (eventId: string) => this.backend.getLeaderboard(eventId);
  override subscribe(eventId: string, onChange: () => void): () => void {
    return this.backend.subscribeFinds(eventId, onChange);
  }
}

@Injectable()
export class SupabaseAdminApi extends AdminApi {
  constructor(private backend: SupabaseBackendService) {
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
