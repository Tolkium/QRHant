/** Square crop from a positioned preview (pan/zoom) into a small JPEG avatar. */
export async function cropSquareAvatar(
  file: File,
  offsetX: number,
  offsetY: number,
  scale: number,
  cropSize: number,
  outputSize = 256,
  quality = 0.85,
): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const srcX = Math.max(0, -offsetX / scale);
  const srcY = Math.max(0, -offsetY / scale);
  const srcSize = cropSize / scale;

  const canvas = document.createElement('canvas');
  canvas.width = outputSize;
  canvas.height = outputSize;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas is not available');
  ctx.drawImage(bitmap, srcX, srcY, srcSize, srcSize, 0, 0, outputSize, outputSize);
  bitmap.close();
  return canvas.toDataURL('image/jpeg', quality);
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
