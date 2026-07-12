/**
 * Canonical card artwork size — uploads, theme placeholders, hunt grid, print.
 * Aspect ratio 3∶4 portrait (360×480).
 */
export const CARD_ART = { width: 360, height: 480 } as const;

export const CARD_ART_ASPECT = CARD_ART.width / CARD_ART.height;

/** For CSS `aspect-ratio` (equivalent to `3 / 4`). */
export const CARD_ART_ASPECT_CSS = '3 / 4' as const;

export const AVATAR_EXPORT_SIZE = 256;

export const CROP_FRAME_WIDTH = 280;

export function cropFrameHeight(variant: 'avatar' | 'card'): number {
  if (variant === 'avatar') return CROP_FRAME_WIDTH;
  return Math.round((CROP_FRAME_WIDTH * CARD_ART.height) / CARD_ART.width);
}

/** Minimum scale so a rotated image covers the crop frame (cover fit). */
export function coverMinScale(
  naturalW: number,
  naturalH: number,
  cropW: number,
  cropH: number,
  rotationDeg: number,
): number {
  const rad = (rotationDeg * Math.PI) / 180;
  const cos = Math.abs(Math.cos(rad));
  const sin = Math.abs(Math.sin(rad));
  return Math.max(
    (cropW * cos + cropH * sin) / naturalW,
    (cropW * sin + cropH * cos) / naturalH,
  );
}

/** Clamp pan offsets when rotation is zero (image must cover frame). */
export function clampCropOffset(
  offset: number,
  displaySize: number,
  cropSize: number,
): number {
  const min = cropSize - displaySize;
  return Math.min(0, Math.max(min, offset));
}
