import {
  AVATAR_EXPORT_SIZE,
  CARD_ART,
  clampCropOffset,
  coverMinScale,
} from './image-dimensions';

export { coverMinScale, clampCropOffset } from './image-dimensions';

/** Crop a framed region (pan / zoom / rotate) into a JPEG data URL. */
export async function cropFramedImage(
  file: File,
  cropW: number,
  cropH: number,
  offsetX: number,
  offsetY: number,
  scale: number,
  rotationDeg: number,
  outputW: number,
  outputH: number,
  quality = 0.85,
): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement('canvas');
  canvas.width = outputW;
  canvas.height = outputH;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas is not available');

  const sx = outputW / cropW;
  const sy = outputH / cropH;
  ctx.scale(sx, sy);
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, cropW, cropH);

  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, cropW, cropH);
  ctx.clip();
  ctx.translate(cropW / 2, cropH / 2);
  ctx.rotate((rotationDeg * Math.PI) / 180);
  ctx.translate(-cropW / 2, -cropH / 2);
  ctx.drawImage(bitmap, offsetX, offsetY, bitmap.width * scale, bitmap.height * scale);
  ctx.restore();

  bitmap.close();
  return canvas.toDataURL('image/jpeg', quality);
}

/** Square crop from a positioned preview (pan/zoom/rotate) into a small JPEG avatar. */
export async function cropSquareAvatar(
  file: File,
  offsetX: number,
  offsetY: number,
  scale: number,
  cropSize: number,
  rotationDeg = 0,
  outputSize = AVATAR_EXPORT_SIZE,
  quality = 0.85,
): Promise<string> {
  return cropFramedImage(
    file,
    cropSize,
    cropSize,
    offsetX,
    offsetY,
    scale,
    rotationDeg,
    outputSize,
    outputSize,
    quality,
  );
}

/** Card artwork crop — 360×640 export matching hunt / print / theme art. */
export async function cropCardArtImage(
  file: File,
  cropW: number,
  cropH: number,
  offsetX: number,
  offsetY: number,
  scale: number,
  rotationDeg: number,
  quality = 0.8,
): Promise<string> {
  return cropFramedImage(
    file,
    cropW,
    cropH,
    offsetX,
    offsetY,
    scale,
    rotationDeg,
    CARD_ART.width,
    CARD_ART.height,
    quality,
  );
}

/** Resize + JPEG compress so large photos fit in IndexedDB / offline packs. */
export async function compressImageFile(
  file: File,
  maxWidth: number,
  quality = 0.85,
): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxWidth / bitmap.width);
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas is not available');
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas.toDataURL('image/jpeg', quality);
}
