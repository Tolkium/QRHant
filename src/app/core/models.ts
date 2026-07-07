/** Shared domain models. Shapes mirror the future Postgres schema. */

export type Lang = 'en' | 'sk' | 'cs';
export const LANGS: Lang[] = ['en', 'sk', 'cs'];

export type Role = 'player' | 'admin';

export interface Profile {
  id: string;
  nickname: string;
  email?: string;
  avatar: string; // preset id (e.g. 'fox') or JPEG data URL
  language: Lang;
  role: Role;
  banned: boolean;
  createdAt: string;
}

export type EventState = 'setup' | 'live' | 'ended';

export interface EventTheme {
  primary: string;
  primaryInk: string;
  accent: string;
  bg: string;
  surface: string;
  ink: string;
  eventName: string;
  logoText: string;
}

export type AnonymizeMode = 'none' | 'firstLetter' | 'hidden';

export interface LeaderboardFlags {
  visible: boolean;
  /** 0 = show all places */
  topN: number;
  anonymize: AnonymizeMode;
  showAvatars: boolean;
  frozen: boolean;
}

export interface HuntSettings {
  manualEntryEnabled: boolean;
  /** invalid code submissions per user before anomaly flag + temp block */
  invalidCodeStrikes: number;
  /** max sync requests per user per minute */
  syncRequestsPerMinute: number;
  minAppVersion: string;
}

/** One site plan per event (building, campus zone, etc.). */
export interface EventMap {
  id: string;
  name: string;
  /** data URL of the plan image */
  image: string;
}

/** Migrate legacy single mapImage field into maps[]. */
export function normalizeEvent(event: HuntEvent & { mapImage?: string | null }): HuntEvent {
  if (event.maps?.length) return event;
  const legacy = event.mapImage;
  if (legacy) {
    return {
      ...event,
      maps: [{ id: crypto.randomUUID(), name: 'Map 1', image: legacy }],
    };
  }
  return { ...event, maps: [] };
}

export interface HuntEvent {
  id: string;
  name: string;
  startsAt: string;
  endsAt: string;
  state: EventState;
  active: boolean;
  theme: EventTheme;
  leaderboardFlags: LeaderboardFlags;
  huntSettings: HuntSettings;
  /** multiple site plans per event */
  maps: EventMap[];
  packVersion: number;
  /** base64 event-wide argon2 salt */
  argonSalt: string;
  argonParams: ArgonParams;
}

export interface ArgonParams {
  /** memory in KiB */
  memory: number;
  iterations: number;
  parallelism: number;
}

/** Admin-side full code record (plaintext code never leaves the server/admin). */
export interface CodeRecord {
  id: string;
  eventId: string;
  code: string;
  title: string;
  art: Record<Lang, string>;
  /** artwork photo as data URL (compressed on upload); shown on the found card */
  image: string | null;
  /** which event map this pin belongs to */
  mapId: string | null;
  /** normalized 0..1 coordinates on the map image; null = not placed */
  mapX: number | null;
  mapY: number | null;
  /** optional admin-only label on the map pin (e.g. "near main stage") */
  mapNote: string | null;
  /** ISO timestamp; null = released from start */
  releaseAt: string | null;
  createdAt: string;
  /** derived crypto fields (also shipped in the pack) */
  tag: string;
  iv: string;
  ciphertext: string;
}

/** One entry of the offline pack: nothing here reveals the plaintext scan code. */
export interface PackEntry {
  id: string;
  /** Artwork name — public label, shown before the code is found. */
  title: string;
  tag: string;
  iv: string;
  ciphertext: string;
  releaseAt: string | null;
}

export interface OfflinePack {
  eventId: string;
  version: number;
  argonSalt: string;
  argonParams: ArgonParams;
  entries: PackEntry[];
}

/** Decrypted card content (the payload that was AES-GCM encrypted). */
export interface CardContent {
  title: string;
  art: Record<Lang, string>;
  /** artwork image (data URL); stays encrypted until the code is found */
  image?: string;
}

/** A find as known on the device. */
export interface LocalFind {
  codeId: string;
  userId: string;
  eventId: string;
  code: string;
  clientFoundAt: string;
  synced: boolean;
  content: CardContent;
}

/** A find as accepted by the server. */
export interface ServerFind {
  userId: string;
  codeId: string;
  eventId: string;
  clientFoundAt: string;
  clampedFoundAt: string;
  syncedAt: string;
}

export interface LeaderboardEntry {
  userId: string;
  nickname: string;
  avatar: string;
  count: number;
  /** clamped time of the latest find, tiebreak */
  lastFindAt: string;
  isYou: boolean;
  rank: number;
}

export interface LeaderboardView {
  flags: LeaderboardFlags;
  entries: LeaderboardEntry[];
  /** the caller's own row, present even when outside topN (if visible) */
  you: LeaderboardEntry | null;
}

export interface AnomalyFlag {
  id: string;
  userId: string;
  nickname: string;
  eventId: string;
  kind: 'invalid-codes' | 'burst-sync' | 'clock-jump' | 'window-cluster';
  detail: string;
  createdAt: string;
}

export interface SyncResult {
  accepted: number;
  duplicates: number;
  rejected: number;
  serverTime: string;
  packVersion: number;
}

export interface DashboardStats {
  totalPlayers: number;
  activePlayers24h: number;
  totalFinds: number;
  findsPerHour: { hour: string; count: number }[];
  perCode: { codeId: string; title: string; count: number }[];
}

export const PRESET_AVATARS = [
  'fox',
  'owl',
  'frog',
  'cat',
  'bee',
  'wolf',
  'panda',
  'octopus',
] as const;

export function isPresetAvatar(avatar: string): boolean {
  return (PRESET_AVATARS as readonly string[]).includes(avatar);
}

export function isCustomAvatar(avatar: string): boolean {
  return avatar.startsWith('data:image/');
}

export const DEFAULT_THEME: EventTheme = {
  primary: '#6d28d9',
  primaryInk: '#ffffff',
  accent: '#f59e0b',
  bg: '#f8f7fc',
  surface: '#ffffff',
  ink: '#17141f',
  eventName: 'QR Hunt',
  logoText: 'QR Hunt',
};

export const DEFAULT_FLAGS: LeaderboardFlags = {
  visible: true,
  topN: 0,
  anonymize: 'none',
  showAvatars: true,
  frozen: false,
};

export const DEFAULT_SETTINGS: HuntSettings = {
  manualEntryEnabled: false,
  invalidCodeStrikes: 5,
  syncRequestsPerMinute: 30,
  minAppVersion: '0.1.0',
};

export const DEFAULT_ARGON: ArgonParams = {
  memory: 24 * 1024,
  iterations: 2,
  parallelism: 1,
};
