import { createHash } from 'node:crypto';
import { mkdir, unlink, writeFile } from 'node:fs/promises';

// Profile and family photos. The browser resizes them to 256px before upload;
// we only accept small JPEG/PNG/WebP data URLs and store them in server/data/media/.
// Served from /api/media/<file>?v=<hash> (the hash changes with the picture).
export const MEDIA_DIR = new URL('../data/media/', import.meta.url);
const MAX_BYTES = 300 * 1024;
const TYPES: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };

export class BadImage extends Error {}

export async function savePhoto(baseName: string, dataUrl: unknown): Promise<string> {
  if (typeof dataUrl !== 'string') throw new BadImage('Please choose a picture.');
  const m = dataUrl.match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/);
  if (!m) throw new BadImage('Please choose a JPEG, PNG or WebP picture.');
  const bytes = Buffer.from(m[2], 'base64');
  if (bytes.length === 0 || bytes.length > MAX_BYTES) throw new BadImage('That picture is too large.');
  const ext = TYPES[m[1]];
  await mkdir(MEDIA_DIR, { recursive: true });
  for (const other of Object.values(TYPES)) if (other !== ext) await unlink(new URL(`${baseName}.${other}`, MEDIA_DIR)).catch(() => undefined);
  await writeFile(new URL(`${baseName}.${ext}`, MEDIA_DIR), bytes);
  const v = createHash('sha256').update(bytes).digest('hex').slice(0, 10);
  return `/api/media/${baseName}.${ext}?v=${v}`;
}

export async function removePhoto(baseName: string): Promise<void> {
  for (const ext of Object.values(TYPES)) await unlink(new URL(`${baseName}.${ext}`, MEDIA_DIR)).catch(() => undefined);
}
