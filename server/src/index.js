import express from 'express';
import cors from 'cors';
import fs from 'node:fs';
import path from 'node:path';
import { initDb } from './db.js';
import { ensureSeed } from './seed.js';
import authRoutes from './routes/auth.js';
import teamRoutes from './routes/teams.js';
import tournamentRoutes from './routes/tournaments.js';
import registrationRoutes from './routes/registrations.js';
import matchRoutes from './routes/matches.js';
import dashboardRoutes from './routes/dashboard.js';
import userRoutes from './routes/users.js';
import { AVATARS_DIR } from './uploads.js';

const PORT = Number(process.env.PORT) || 4000;

await initDb();
await ensureSeed();

const app = express();

const allowedOrigins = (process.env.CLIENT_ORIGIN || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: allowedOrigins.length ? allowedOrigins : true,
  }),
);
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.use('/api/auth', authRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/tournaments', tournamentRoutes);
app.use('/api/registrations', registrationRoutes);
app.use('/api/matches', matchRoutes);
app.use('/api/users', userRoutes);
// Uploaded profile photos (before the SPA catch-all).
app.use('/uploads', express.static(AVATARS_DIR, { dotfiles: 'deny', index: false }));
app.use('/api', dashboardRoutes);

app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'API route not found.' });
});

// Serve the built frontend from the same origin in production.
const distPath = path.resolve(import.meta.dirname, '../../client/dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

app.use((err, _req, res, _next) => {
  const status = err.status || 500;
  if (status >= 500) {
    console.error(err);
  }
  res.status(status).json({
    error: err.message || 'Something went wrong.',
  });
});

app.listen(PORT, () => {
  console.log(`Free Fire Arena API running on http://localhost:${PORT}`);
});
