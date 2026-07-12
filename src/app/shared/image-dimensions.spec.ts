import { describe, expect, it } from 'vitest';
import {
  CARD_ART,
  CARD_ART_ASPECT,
  CARD_ART_ASPECT_CSS,
  clampCropOffset,
  coverMinScale,
  cropFrameHeight,
  CROP_FRAME_WIDTH,
} from './image-dimensions';

describe('image-dimensions', () => {
  it('uses 360×480 for all card artwork', () => {
    expect(CARD_ART).toEqual({ width: 360, height: 480 });
  });

  it('derives 3:4 aspect ratio from CARD_ART', () => {
    expect(CARD_ART_ASPECT).toBeCloseTo(3 / 4, 8);
    expect(CARD_ART_ASPECT_CSS).toBe('3 / 4');
  });

  it('derives card crop frame height from CARD_ART', () => {
    expect(cropFrameHeight('avatar')).toBe(CROP_FRAME_WIDTH);
    expect(cropFrameHeight('card')).toBe(Math.round((CROP_FRAME_WIDTH * CARD_ART.height) / CARD_ART.width));
  });
});

describe('coverMinScale', () => {
  const cropW = 280;
  const cropH = cropFrameHeight('card');

  it('covers a landscape photo at 0° rotation', () => {
    const scale = coverMinScale(4000, 3000, cropW, cropH, 0);
    expect(scale).toBeCloseTo(Math.max(cropW / 4000, cropH / 3000), 8);
  });

  it('changes required scale when rotated 90°', () => {
    const base = coverMinScale(4000, 3000, cropW, cropH, 0);
    const rotated = coverMinScale(4000, 3000, cropW, cropH, 90);
    expect(rotated).not.toBe(base);
  });

  it('is unchanged at 180° vs 0° for symmetric frame', () => {
    const at0 = coverMinScale(2000, 3000, cropW, cropH, 0);
    const at180 = coverMinScale(2000, 3000, cropW, cropH, 180);
    expect(at180).toBeCloseTo(at0, 8);
  });
});

describe('clampCropOffset', () => {
  it('clamps when image is larger than crop box', () => {
    expect(clampCropOffset(10, 400, 280)).toBe(0);
    expect(clampCropOffset(-500, 400, 280)).toBe(-120);
    expect(clampCropOffset(-50, 400, 280)).toBe(-50);
  });

  it('allows centering when image is smaller than crop box', () => {
    expect(clampCropOffset(40, 200, 280)).toBe(0);
  });
});
