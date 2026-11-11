import jwt from 'jsonwebtoken';
import { one } from './db.js';

const SECRET = process.env.JWT_SECRET || 'dev-only-freefire-arena-secret';
const TOKEN_TTL = '7d';

export function signToken(user) {
  return jwt.sign({ sub: String(user.id) }, SECRET, { expiresIn: TOKEN_TTL });
}

export function publicUser(user) {
  return {
    id: user.id,
    email: user.email,
    displayName: user.display_name,
    ffUid: user.ff_uid,
    role: user.role,
    avatarColor: user.avatar_color,
    avatarPhoto: user.avatar_photo ? `/uploads/${user.avatar_photo}` : null,
    createdAt: user.created_at,
  };
}

async function resolveUser(req) {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) return null;
  const token = header.slice(7).trim();
  if (!token) return null;
  try {
    const payload = jwt.verify(token, SECRET);
    const user = await one('SELECT * FROM users WHERE id = $1', [Number(payload.sub)]);
    return user;
  } catch {
    return null;
  }
}

export async function optionalAuth(req, _res, next) {
  req.user = await resolveUser(req);
  next();
}

export async function authRequired(req, res, next) {
  req.user = await resolveUser(req);
  if (!req.user) {
    return res.status(401).json({ error: 'You need to sign in to do that.' });
  }
  next();
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Sign in required.' });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'You do not have permission to do that.' });
    }
    next();
  };
}

export function canManageTournament(tournament, user) {
  if (!tournament || !user) return false;
  return user.role === 'admin' || tournament.organizer_id === user.id;
}
