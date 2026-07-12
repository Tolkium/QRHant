export type HuntNavIconSlot = 'codes' | 'scan' | 'rank';

export type HuntNavIconThemeId =
  | 'default'
  | 'shrine'
  | 'atlas'
  | 'scrapbook'
  | 'kiyo'
  | 'liquid'
  | 'wamon'
  | 'sumi'
  | 'kawaii'
  | 'izakaya'
  | 'zen';

const DEFAULT: Record<HuntNavIconSlot, string> = {
  codes:
    '<svg class="hunt-nav-icon" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>',
  scan:
    '<svg class="hunt-nav-icon" viewBox="0 0 24 24"><path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><line x1="7" y1="12" x2="17" y2="12"/></svg>',
  rank:
    '<svg class="hunt-nav-icon" viewBox="0 0 24 24"><path d="M8 21h8"/><path d="M12 17v4"/><path d="M7 4h10"/><path d="M17 4v5a5 5 0 0 1-10 0V4"/></svg>',
};

/** Ported from design/index.html themeIcons — keyed by cosmetics theme id. */
export const HUNT_NAV_ICONS: Record<HuntNavIconThemeId, Record<HuntNavIconSlot, string>> = {
  default: DEFAULT,
  shrine: {
    codes:
      '<svg class="hunt-nav-icon" viewBox="0 0 24 24"><path d="M4 20h16"/><path d="M6 20V10M18 20V10"/><path d="M2 10h20"/><path d="M12 4v6"/><path d="M8 10h8" stroke-width="2.5"/></svg>',
    scan:
      '<svg class="hunt-nav-icon" viewBox="0 0 24 24"><rect x="8" y="4" width="8" height="12" rx="1"/><path d="M8 16h8v2H8z"/><path d="M10 18v2M14 18v2"/><line x1="6" y1="8" x2="8" y2="8"/><line x1="16" y1="8" x2="18" y2="8"/></svg>',
    rank:
      '<svg class="hunt-nav-icon" viewBox="0 0 24 24"><path d="M12 4v3"/><path d="M9 20h6"/><ellipse cx="12" cy="13" rx="5" ry="4"/><path d="M12 7c-2 0-3 1.5-3 3.5S10 14 12 14s3-1.5 3-3.5S14 7 12 7z"/></svg>',
  },
  atlas: {
    codes:
      '<svg class="hunt-nav-icon" viewBox="0 0 24 24"><path d="M4 6c4-2 8 2 12 0s8 2 8 0v12c-4 2-8-2-12 0s-8-2-8 0V6z"/><line x1="12" y1="6" x2="12" y2="18" stroke-dasharray="2 2"/></svg>',
    scan:
      '<svg class="hunt-nav-icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><polygon points="12,6 14,12 12,11 10,12" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none"/></svg>',
    rank:
      '<svg class="hunt-nav-icon" viewBox="0 0 24 24"><path d="M5 4h14v4l-2 12H7L5 8z"/><path d="M9 4V2h6v2"/><circle cx="12" cy="11" r="2"/></svg>',
  },
  scrapbook: {
    codes:
      '<svg class="hunt-nav-icon" viewBox="0 0 24 24"><rect x="3" y="5" width="10" height="12" rx="1" transform="rotate(-6 8 11)"/><rect x="11" y="7" width="10" height="12" rx="1" transform="rotate(4 16 13)"/></svg>',
    scan:
      '<svg class="hunt-nav-icon" viewBox="0 0 24 24"><rect x="4" y="7" width="16" height="11" rx="2"/><circle cx="12" cy="12.5" r="3.5"/><circle cx="17" cy="9" r="1" fill="currentColor" stroke="none"/></svg>',
    rank:
      '<svg class="hunt-nav-icon" viewBox="0 0 24 24"><polygon points="12,3 15,10 22,10 16.5,14.5 18.5,22 12,17.5 5.5,22 7.5,14.5 2,10 9,10" fill="currentColor" stroke="none"/></svg>',
  },
  kiyo: {
    codes:
      '<svg class="hunt-nav-icon" viewBox="0 0 24 24"><rect x="4" y="4" width="7" height="7" rx="2"/><rect x="13" y="4" width="7" height="7" rx="2"/><rect x="4" y="13" width="7" height="7" rx="2"/><rect x="13" y="13" width="7" height="7" rx="2"/></svg>',
    scan:
      '<svg class="hunt-nav-icon" viewBox="0 0 24 24"><path d="M4 8V6a2 2 0 0 1 2-2h1"/><path d="M17 4h1a2 2 0 0 1 2 2v2"/><path d="M20 17v1a2 2 0 0 1-2 2h-1"/><path d="M7 20H6a2 2 0 0 1-2-2v-1"/><rect x="8" y="8" width="8" height="8" rx="2"/></svg>',
    rank:
      '<svg class="hunt-nav-icon" viewBox="0 0 24 24"><rect x="5" y="14" width="3" height="6" rx="1"/><rect x="10.5" y="10" width="3" height="10" rx="1"/><rect x="16" y="6" width="3" height="14" rx="1"/></svg>',
  },
  liquid: {
    codes:
      '<svg class="hunt-nav-icon" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="2.5" opacity="0.9"/><rect x="14" y="3" width="7" height="7" rx="2.5" opacity="0.7"/><rect x="3" y="14" width="7" height="7" rx="2.5" opacity="0.7"/><rect x="14" y="14" width="7" height="7" rx="2.5" opacity="0.5"/></svg>',
    scan:
      '<svg class="hunt-nav-icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" opacity="0.3"/><path d="M4 9V7a3 3 0 0 1 3-3h1"/><path d="M17 4h1a3 3 0 0 1 3 3v2"/><path d="M20 16v1a3 3 0 0 1-3 3h-1"/><path d="M7 20H6a3 3 0 0 1-3-3v-1"/><circle cx="12" cy="12" r="4"/></svg>',
    rank:
      '<svg class="hunt-nav-icon" viewBox="0 0 24 24"><path d="M6 18V8l6-3 6 3v10" opacity="0.4"/><path d="M6 18V8l6-3 6 3v10" fill="none"/><circle cx="12" cy="6" r="2"/></svg>',
  },
  wamon: {
    codes:
      '<svg class="hunt-nav-icon" viewBox="0 0 24 24"><path d="M4 14 Q8 10 12 14 Q16 10 20 14" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="8" cy="8" r="3" fill="none" stroke="currentColor" stroke-width="1.2"/><circle cx="16" cy="8" r="2" fill="currentColor" opacity="0.3"/></svg>',
    scan:
      '<svg class="hunt-nav-icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M8 12 Q12 8 16 12 Q12 16 8 12" fill="none" stroke="currentColor" stroke-width="1"/><circle cx="12" cy="12" r="2" fill="currentColor" opacity="0.5"/></svg>',
    rank:
      '<svg class="hunt-nav-icon" viewBox="0 0 24 24"><circle cx="12" cy="10" r="3" fill="none" stroke="currentColor" stroke-width="1.3"/><ellipse cx="12" cy="9" rx="2" ry="5" fill="none" stroke="currentColor" stroke-width="1"/><ellipse cx="12" cy="9" rx="5" ry="2" fill="none" stroke="currentColor" stroke-width="1"/><path d="M8 18h8" stroke="currentColor" stroke-width="1.5"/></svg>',
  },
  sumi: {
    codes:
      '<svg class="hunt-nav-icon" viewBox="0 0 24 24"><path d="M4 6h16M4 12h12M4 18h8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    scan:
      '<svg class="hunt-nav-icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="currentColor" opacity="0.15"/><circle cx="12" cy="12" r="7" fill="currentColor"/><line x1="7" y1="12" x2="17" y2="12" stroke="#fff" stroke-width="1.5" opacity="0.4"/></svg>',
    rank:
      '<svg class="hunt-nav-icon" viewBox="0 0 24 24"><path d="M6 18 L12 6 L18 18" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M9 14 L12 8 L15 14" fill="#fff" opacity="0.3"/></svg>',
  },
  kawaii: {
    codes:
      '<svg class="hunt-nav-icon" viewBox="0 0 24 24"><rect x="4" y="4" width="7" height="7" rx="3" fill="currentColor" opacity="0.25"/><rect x="13" y="4" width="7" height="7" rx="3" fill="currentColor" opacity="0.4"/><rect x="4" y="13" width="7" height="7" rx="3" fill="currentColor" opacity="0.4"/><rect x="13" y="13" width="7" height="7" rx="3" fill="currentColor" opacity="0.25"/></svg>',
    scan:
      '<svg class="hunt-nav-icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="currentColor" opacity="0.2"/><circle cx="12" cy="12" r="6" fill="currentColor"/><circle cx="12" cy="12" r="2" fill="#fff"/></svg>',
    rank:
      '<svg class="hunt-nav-icon" viewBox="0 0 24 24"><rect x="5" y="14" width="4" height="7" rx="2" fill="currentColor" opacity="0.35"/><rect x="10" y="9" width="4" height="12" rx="2" fill="currentColor" opacity="0.55"/><rect x="15" y="5" width="4" height="16" rx="2" fill="currentColor"/></svg>',
  },
  izakaya: {
    codes:
      '<svg class="hunt-nav-icon" viewBox="0 0 24 24"><ellipse cx="12" cy="14" rx="8" ry="5" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M8 14 Q12 8 16 14" stroke="currentColor" stroke-width="1.5" fill="none"/><line x1="6" y1="18" x2="18" y2="18" stroke="currentColor" stroke-width="1.5"/></svg>',
    scan:
      '<svg class="hunt-nav-icon" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" stroke-width="2"/><line x1="16" y1="16" x2="21" y2="21" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    rank:
      '<svg class="hunt-nav-icon" viewBox="0 0 24 24"><circle cx="12" cy="8" r="4" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M6 20 Q12 16 18 20" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>',
  },
  zen: {
    codes:
      '<svg class="hunt-nav-icon" viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="3" fill="currentColor" opacity="0.1" stroke="currentColor" stroke-width="1.5"/><text x="12" y="16" text-anchor="middle" font-size="11" font-family="serif" fill="currentColor">札</text></svg>',
    scan:
      '<svg class="hunt-nav-icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="currentColor" opacity="0.1"/><text x="12" y="16" text-anchor="middle" font-size="11" font-family="serif" fill="currentColor">見</text></svg>',
    rank:
      '<svg class="hunt-nav-icon" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="3" fill="currentColor" opacity="0.08"/><text x="12" y="16" text-anchor="middle" font-size="11" font-family="serif" fill="currentColor">順</text></svg>',
  },
};

const ICON_THEME_IDS = new Set<string>(Object.keys(HUNT_NAV_ICONS));

export function resolveNavIconThemeId(cosmeticsId: string | null | undefined): HuntNavIconThemeId {
  if (cosmeticsId && ICON_THEME_IDS.has(cosmeticsId)) {
    return cosmeticsId as HuntNavIconThemeId;
  }
  return 'default';
}

export function huntNavIconSvg(
  cosmeticsId: string | null | undefined,
  slot: HuntNavIconSlot,
): string {
  const themeId = resolveNavIconThemeId(cosmeticsId);
  return HUNT_NAV_ICONS[themeId][slot];
}
