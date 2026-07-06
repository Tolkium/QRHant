import type {
  AnomalyFlag,
  CodeRecord,
  DashboardStats,
  HuntEvent,
  Lang,
  LeaderboardView,
  OfflinePack,
  Profile,
  ServerFind,
  SyncResult,
} from '../models';

/**
 * The single boundary between UI and backend. The alpha binds MockBackend
 * (fully on-device); the production build binds SupabaseBackend. UI code may
 * only depend on these abstract classes.
 */

export interface Credentials {
  nickname: string;
  password: string;
  email?: string;
  language?: Lang;
}

export interface FindSubmission {
  codeId: string;
  code: string;
  clientFoundAt: string;
}

export abstract class AuthApi {
  /** Restore a persisted session; resolves null when none exists. */
  abstract restoreSession(): Promise<Profile | null>;
  abstract register(creds: Credentials): Promise<Profile>;
  abstract login(creds: Credentials): Promise<Profile>;
  abstract logout(): Promise<void>;
  abstract updateProfile(patch: Partial<Pick<Profile, 'avatar' | 'language'>>): Promise<Profile>;
}

export abstract class CodesApi {
  abstract getActiveEvent(): Promise<HuntEvent | null>;
  abstract getPack(eventId: string): Promise<OfflinePack>;
  abstract getPackVersion(eventId: string): Promise<number>;
}

export abstract class FindsApi {
  /** Batched, idempotent, server-validated submission. */
  abstract submitFinds(eventId: string, finds: FindSubmission[]): Promise<SyncResult>;
}

export abstract class LeaderboardApi {
  abstract getLeaderboard(eventId: string): Promise<LeaderboardView>;
  /**
   * Live updates: invoke the callback whenever standings may have changed.
   * Default is a no-op (mock has no other devices); SupabaseBackend overrides
   * with a Realtime subscription on the finds table.
   */
  subscribe(_eventId: string, _onChange: () => void): () => void {
    return () => undefined;
  }
}

export interface BulkGenerateRequest {
  count: number;
  titlePrefix: string;
}

export abstract class AdminApi {
  abstract listEvents(): Promise<HuntEvent[]>;
  abstract createEvent(name: string): Promise<HuntEvent>;
  abstract updateEvent(event: HuntEvent): Promise<HuntEvent>;
  abstract setActiveEvent(eventId: string): Promise<void>;

  abstract listCodes(eventId: string): Promise<CodeRecord[]>;
  abstract bulkGenerateCodes(eventId: string, req: BulkGenerateRequest): Promise<CodeRecord[]>;
  abstract updateCode(code: CodeRecord): Promise<CodeRecord>;
  abstract deleteCode(codeId: string): Promise<void>;

  abstract listPlayers(): Promise<Profile[]>;
  abstract setBanned(userId: string, banned: boolean): Promise<void>;
  abstract resetPassword(userId: string, newPassword: string): Promise<void>;

  abstract getStats(eventId: string): Promise<DashboardStats>;
  abstract listAnomalies(eventId: string): Promise<AnomalyFlag[]>;
  abstract listFinds(eventId: string): Promise<ServerFind[]>;
}
