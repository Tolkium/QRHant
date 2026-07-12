import type { BuiltinThemeId } from '../../../core/themes/theme-registry';

const DEFAULT_LOCK =
  '<svg class="hunt-card-lock-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="11" width="14" height="10" rx="1"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>';

/** Per-theme locked-card glyphs for the generic inner card layer — keyed by cosmetics theme id. */
export const HUNT_CARD_LOCK_ICONS: Record<BuiltinThemeId | 'default', string> = {
  default: DEFAULT_LOCK,
  neon: '<svg class="hunt-card-lock-icon" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="1.2" opacity="0.35"/><rect x="7" y="11" width="10" height="8" rx="1" stroke="currentColor" stroke-width="1.8"/><path d="M9 11V8.5a3 3 0 0 1 6 0V11" stroke="currentColor" stroke-width="1.8"/></svg>',
  pop: '<svg class="hunt-card-lock-icon" viewBox="0 0 24 24" fill="none"><rect x="4" y="10" width="16" height="11" rx="1" stroke="currentColor" stroke-width="2.5"/><path d="M8 10V7a4 4 0 0 1 8 0v3" stroke="currentColor" stroke-width="2.5"/></svg>',
  forest: '<svg class="hunt-card-lock-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M12 4C9 8 8 10 8 12a4 4 0 0 0 8 0c0-2-1-4-4-8z"/><rect x="7" y="12" width="10" height="7" rx="1"/><path d="M10 12V10a2 2 0 0 1 4 0v2"/></svg>',
  arcade: '<svg class="hunt-card-lock-icon" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="10" width="12" height="10"/><rect x="9" y="6" width="6" height="4"/><rect x="10" y="13" width="2" height="2" fill="var(--c-bg, #111)"/><rect x="12" y="13" width="2" height="2" fill="var(--c-bg, #111)"/></svg>',
  sakura: '<svg class="hunt-card-lock-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="8" r="3" fill="currentColor" opacity="0.25"/><path d="M12 11v2"/><rect x="7.5" y="13" width="9" height="7" rx="2"/><path d="M10 13v-1.5a2 2 0 0 1 4 0V13"/></svg>',
  shrine: '<svg class="hunt-card-lock-icon" viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="2"><rect x="8" y="12" width="24" height="20" rx="1"/><path d="M14 12V9a6 6 0 0 1 12 0v3"/></svg>',
  atlas: '<svg class="hunt-card-lock-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="12" r="8"/><polygon points="12,7 13.2,10.8 17,12 13.2,13.2 12,17 10.8,13.2 7,12 10.8,10.8" fill="currentColor" opacity="0.35" stroke="none"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/></svg>',
  scrapbook: '<svg class="hunt-card-lock-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="5" y="8" width="14" height="13" rx="1" transform="rotate(-3 12 14.5)"/><path d="M8 8V6a4 4 0 0 1 8 0v2" transform="rotate(-3 12 7)"/><line x1="4" y1="6" x2="8" y2="5" stroke="currentColor" stroke-width="3" opacity="0.5"/></svg>',
  kiyo: '<svg class="hunt-card-lock-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M6 18h12"/><path d="M8 18V11l4-5 4 5v7" opacity="0.4"/><rect x="9" y="12" width="6" height="6" rx="1"/><path d="M11 12V10a1 1 0 0 1 2 0v2"/></svg>',
  liquid: '<svg class="hunt-card-lock-icon" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.2" opacity="0.45"/><rect x="7.5" y="11" width="9" height="7" rx="1.5" stroke="currentColor" stroke-width="1.5" fill="currentColor" opacity="0.12"/><path d="M9.5 11V8.5a2.5 2.5 0 0 1 5 0V11" stroke="currentColor" stroke-width="1.5"/></svg>',
  wamon: '<svg class="hunt-card-lock-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><circle cx="12" cy="12" r="9" opacity="0.25"/><text x="12" y="16" text-anchor="middle" font-size="11" font-family="serif" fill="currentColor">鍵</text></svg>',
  sumi: '<svg class="hunt-card-lock-icon" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="9" r="5" fill="currentColor" opacity="0.2"/><text x="12" y="19" text-anchor="middle" font-size="12" font-family="serif" fill="currentColor">秘</text></svg>',
  kawaii: '<svg class="hunt-card-lock-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="6" y="11" width="12" height="9" rx="3"/><path d="M9 11V9a3 3 0 0 1 6 0v2"/><circle cx="9.5" cy="15" r="0.8" fill="currentColor"/><circle cx="14.5" cy="15" r="0.8" fill="currentColor"/></svg>',
  izakaya: '<svg class="hunt-card-lock-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><ellipse cx="12" cy="14" rx="8" ry="5"/><path d="M8 14 Q12 9 16 14" stroke="currentColor" stroke-width="1.4" fill="none"/><line x1="6" y1="18" x2="18" y2="18"/></svg>',
  zen: '<svg class="hunt-card-lock-icon" viewBox="0 0 24 24" fill="none"><rect x="4" y="4" width="16" height="16" rx="3" stroke="currentColor" stroke-width="1.4" fill="currentColor" opacity="0.08"/><text x="12" y="16" text-anchor="middle" font-size="11" font-family="serif" fill="currentColor">秘</text></svg>',
};

const LOCK_THEME_IDS = new Set<string>(Object.keys(HUNT_CARD_LOCK_ICONS));

export function huntCardLockSvg(cosmeticsId: string | null | undefined): string {
  if (cosmeticsId && LOCK_THEME_IDS.has(cosmeticsId)) {
    return HUNT_CARD_LOCK_ICONS[cosmeticsId as BuiltinThemeId | 'default'];
  }
  return HUNT_CARD_LOCK_ICONS.default;
}
