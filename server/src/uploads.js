import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

/** Directory where profile photos are stored (override with UPLOAD_DIR). */
export const AVATARS_DIR =
  process.env.UPLOAD_DIR || path.resolve(import.meta.dirname, '../uploads/avatars');

fs.mkdirSync(AVATARS_DIR, { recursive: true });

const EXTENSIONS = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

export function avatarExt(mimetype) {
  return EXTENSIONS[mimetype] || null;
}

/** Server-generated filename — the client's filename is never used. */
export function newAvatarName(userId, ext) {
  return `${userId}-${Date.now()}-${crypto.randomBytes(4).toString('hex')}.${ext}`;
}

/** Best-effort unlink, restricted to files inside AVATARS_DIR (no traversal). */
export function removeAvatarFile(filename) {
  if (!filename) return;
  const safe = path.basename(filename);
  fs.rm(path.join(AVATARS_DIR, safe), { force: true }, () => {});
}
