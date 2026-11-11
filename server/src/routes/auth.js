import { Router } from 'express';
import multer from 'multer';
import { one, query } from '../db.js';
import { authRequired, publicUser, signToken } from '../auth.js';
import { hashPassword, verifyPassword } from '../password.js';
import { cleanString, h } from '../helpers.js';
import { AVATARS_DIR, avatarExt, newAvatarName, removeAvatarFile } from '../uploads.js';

const router = Router();

export const AVATAR_COLORS = ['#ff6a00', '#ffb056', '#4cc9f0', '#f72585', '#7bdff2', '#b5179e', '#f9c74f'];

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, AVATARS_DIR),
    // Filename is generated server-side; the client's name is never used.
    filename: (req, file, cb) => cb(null, newAvatarName(req.user.id, avatarExt(file.mimetype))),
  }),
  fileFilter: (_req, file, cb) => {
    if (!avatarExt(file.mimetype)) {
      return cb(new Error('Upload a JPG, PNG, or WebP image.'));
    }
    cb(null, true);
  },
  limits: { fileSize: 2 * 1024 * 1024 },
});

// Wraps multer so its errors surface as clean 400s instead of 500s.
function runPhotoUpload(req, res, next) {
  upload.single('photo')(req, res, (err) => {
    if (err) {
      const message =
        err.code === 'LIMIT_FILE_SIZE'
          ? 'Image must be 2 MB or smaller.'
          : err.message || 'Upload failed.';
      return res.status(400).json({ error: message });
    }
    next();
  });
}

router.post(
  '/register',
  h(async (req, res) => {
    const email = cleanString(req.body.email, 120).toLowerCase();
    const password = String(req.body.password || '');
    const displayName = cleanString(req.body.displayName, 32);
    const ffUid = cleanString(req.body.ffUid, 20);
    const requestedRole = cleanString(req.body.role, 20).toLowerCase();
    const role = requestedRole === 'organizer' ? 'organizer' : 'player';

    if (!validateEmail(email)) {
      return res.status(400).json({ error: 'Enter a valid email address.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }
    if (displayName.length < 3) {
      return res.status(400).json({ error: 'Display name must be at least 3 characters.' });
    }
    if (ffUid && !/^\d{6,15}$/.test(ffUid)) {
      return res.status(400).json({ error: 'Free Fire UID should be 6–15 digits.' });
    }

    const existing = await one('SELECT id FROM users WHERE email = $1', [email]);
    if (existing) {
      return res.status(409).json({ error: 'An account with that email already exists.' });
    }

    const avatarColor =
      AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];

    const user = await one(
      `INSERT INTO users (email, password_hash, display_name, ff_uid, role, avatar_color)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [email, hashPassword(password), displayName, ffUid || null, role, avatarColor],
    );

    res.status(201).json({ token: signToken(user), user: publicUser(user) });
  }),
);

router.post(
  '/login',
  h(async (req, res) => {
    const email = cleanString(req.body.email, 120).toLowerCase();
    const password = String(req.body.password || '');
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const user = await one('SELECT * FROM users WHERE email = $1', [email]);
    if (!user || !verifyPassword(password, user.password_hash)) {
      return res.status(401).json({ error: 'Incorrect email or password.' });
    }

    res.json({ token: signToken(user), user: publicUser(user) });
  }),
);

router.get('/me', authRequired, h(async (req, res) => {
  res.json({ user: publicUser(req.user) });
}));

/**
 * PATCH /api/auth/me — edit the signed-in player's profile.
 * Accepts any subset of: displayName, ffUid, avatarColor,
 * newPassword + currentPassword (password changes only).
 * Email is intentionally not editable.
 */
router.patch(
  '/me',
  authRequired,
  h(async (req, res) => {
    const body = req.body || {};
    const sets = [];
    const values = [];
    let next = 1;

    if (Object.hasOwn(body, 'displayName')) {
      const displayName = cleanString(body.displayName, 32);
      if (displayName.length < 3) {
        return res.status(400).json({ error: 'Display name must be at least 3 characters.' });
      }
      sets.push(`display_name = $${next++}`);
      values.push(displayName);
    }

    if (Object.hasOwn(body, 'ffUid')) {
      const ffUid = cleanString(body.ffUid, 20);
      if (ffUid && !/^\d{6,15}$/.test(ffUid)) {
        return res.status(400).json({ error: 'Free Fire UID must be 6–15 digits.' });
      }
      sets.push(`ff_uid = $${next++}`);
      values.push(ffUid || null);
    }

    if (Object.hasOwn(body, 'avatarColor')) {
      const avatarColor = String(body.avatarColor || '').toLowerCase();
      if (!AVATAR_COLORS.includes(avatarColor)) {
        return res.status(400).json({ error: 'Pick a color from the palette.' });
      }
      sets.push(`avatar_color = $${next++}`);
      values.push(avatarColor);
    }

    if (Object.hasOwn(body, 'newPassword')) {
      const newPassword = String(body.newPassword || '');
      const currentPassword = String(body.currentPassword || '');
      if (newPassword.length < 6) {
        return res.status(400).json({ error: 'New password must be at least 6 characters.' });
      }
      if (!verifyPassword(currentPassword, req.user.password_hash)) {
        return res.status(401).json({ error: 'Current password is incorrect.' });
      }
      sets.push(`password_hash = $${next++}`);
      values.push(hashPassword(newPassword));
    }

    if (!sets.length) {
      return res.status(400).json({ error: 'Nothing to update.' });
    }

    values.push(req.user.id);
    const user = await one(
      `UPDATE users SET ${sets.join(', ')} WHERE id = $${next} RETURNING *`,
      values,
    );

    res.json({ user: publicUser(user) });
  }),
);

/**
 * POST /api/auth/me/photo — upload a profile photo (multipart, field "photo").
 * Saved to disk under AVATARS_DIR; the old file is deleted on replace.
 */
router.post(
  '/me/photo',
  authRequired,
  runPhotoUpload,
  h(async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: 'Choose an image to upload.' });
    }

    const previous = req.user.avatar_photo;
    await query('UPDATE users SET avatar_photo = $1 WHERE id = $2', [
      req.file.filename,
      req.user.id,
    ]);
    if (previous && previous !== req.file.filename) removeAvatarFile(previous);

    const user = await one('SELECT * FROM users WHERE id = $1', [req.user.id]);
    res.json({ user: publicUser(user) });
  }),
);

/** DELETE /api/auth/me/photo — remove the photo (falls back to initials). */
router.delete(
  '/me/photo',
  authRequired,
  h(async (req, res) => {
    const previous = req.user.avatar_photo;
    await query('UPDATE users SET avatar_photo = NULL WHERE id = $1', [req.user.id]);
    if (previous) removeAvatarFile(previous);

    const user = await one('SELECT * FROM users WHERE id = $1', [req.user.id]);
    res.json({ user: publicUser(user) });
  }),
);

export default router;
