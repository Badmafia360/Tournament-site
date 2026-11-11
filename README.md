# Free Fire Arena

A full-stack tournament platform MVP for Free Fire: players form squads, register for
events, follow live brackets and standings, and organizers run the whole event from a
single console.

The demo ships with seeded users, teams, four tournaments, a completed bracket, and a
live battle royale with results already on the board.

---

## Stack

| Layer      | Choice                                                        |
| ---------- | ------------------------------------------------------------- |
| Frontend   | React 19, Vite 8, Tailwind CSS 4, React Router 7              |
| Backend    | Node.js (Express 4), REST API                                 |
| Database   | PGlite (Postgres compiled to WASM) — zero-install locally     |
| Auth       | Email/password, scrypt hashing, JWT bearer tokens             |
| Realtime   | Polling (public pages refresh every 12–30s)                   |
| Deployment | Vercel project with two services (client + server), or a single Node server that also serves the built frontend |

PGlite gives us real PostgreSQL semantics (SERIAL, `FILTER`, JSON, transactions, partial
indexes) without requiring a database server, which makes the MVP easy to run on any
machine. The SQL is intentionally portable for a later move to managed Postgres.

---

## Quick start

```bash
npm install
npm run dev
```

- App: http://localhost:5173
- API: http://localhost:4000
- Health: http://localhost:4000/api/health

On first boot the database is created at `server/data/pgdata` and seeded automatically.
To wipe and reseed at any time:

```bash
npm run seed -- --reset
```

### Production-style run

```bash
npm run build
npm start
```

The Express server serves `client/dist` on the same origin (default port 4000), so the
whole app runs from one process.

### Deploying to Vercel

`vercel.json` at the repo root configures **services mode**: one Vercel project made of
two independently built services.

| Service   | Directory | Public paths                       |
| --------- | --------- | ---------------------------------- |
| `client`  | `client`  | everything not matched below (SPA) |
| `server`  | `server`  | `/api/*` and `/uploads/*`          |

- Each service installs and builds from its own directory (`vite build` → `dist` for the
  client, no build step for the Express server).
- The browser talks to the API with same-origin relative URLs (`/api/...`,
  `/uploads/avatars/...`), so **no service-to-service bindings are needed** — nothing
  calls another service at runtime.
- `JWT_SECRET` (and optionally `CLIENT_ORIGIN`) must be set in the project's
  environment variables.
- Note: profile photos are written to `/tmp` on Vercel and are lost between deploys;
  PGlite's data directory is likewise ephemeral. Point `UPLOAD_DIR` / `PGLITE_DIR` at a
  durable store (or move to managed Postgres + object storage) before real use.

### Environment variables

Copy `.env.example` and set values before starting:

| Variable          | Default                       | Notes                                    |
| ----------------- | ----------------------------- | ---------------------------------------- |
| `PORT`            | `4000`                        | API / app port                           |
| `JWT_SECRET`      | dev fallback                  | **Set this in production**               |
| `CLIENT_ORIGIN`   | allow all (dev)               | Comma-separated allowed origins          |
| `PGLITE_DIR`      | `server/data/pgdata`          | Database directory                       |

Environment variables are read from the process, not a `.env` loader. Export them or use
your process manager / hosting provider's env settings.

---

## Demo accounts

All accounts use the passwords shown below.

| Role      | Email                   | Password       |
| --------- | ----------------------- | -------------- |
| Player    | `player@freefire.gg`    | `player123`    |
| Organizer | `organizer@freefire.gg` | `organizer123` |
| Admin     | `admin@freefire.gg`     | `admin123`     |

The login screen also has one-tap demo buttons. Other seeded captains use
`nova@freefire.gg`, `iron@freefire.gg`, `toxic@freefire.gg`, etc. with password
`player123`.

Seeded events:

| Event                 | Format          | State        | What to try                                       |
| --------------------- | --------------- | ------------ | ------------------------------------------------- |
| Nightfall Showdown    | Battle royale   | Live         | Standings, per-match results, unlocked room       |
| Ember Cup Season 4    | Single elim     | Registration | Register a team, approve/seed, generate bracket   |
| Rookie Rumble #12     | Single elim     | Completed    | Finished bracket + champion                       |
| Clash of Fangs        | Battle royale   | Registration | Large prize pool, pending approvals               |

---

## What works

### Players and teams

- Sign up / sign in with email, password, display name, and optional Free Fire UID
- Create teams, get an invite code, join a team with a code — **joining or
  creating a team requires the player's Free Fire UID** (6–15 digits), saved
  to their profile for roster and check-in display
- View rosters, captain status, and team tournament history
- Browse tournaments as a day-by-day schedule (several events can share one
  day) with status filters and search; organizers can toggle to only their own events
- Register a team (captain only), see pending / approved / waitlist state
- Player dashboard: teams, entries, upcoming matches, unlocked room credentials
- Public player profiles (`/players/:id`) reachable from team rosters: avatar,
  display name, UID, teams, tournament history, stats — **email is never exposed**
- Editable own profile (navbar avatar → `/profile`): display name, Free Fire UID,
  avatar color (7-color palette), password change (current password required),
  and a **profile photo** (JPG/PNG/WebP, max 2 MB → saved to `server/uploads/avatars/`,
  shown everywhere an avatar appears, with an automatic initials fallback)
- Room ID/password reveal only to members of approved teams, after the reveal window
- Live bracket, standings, announcements, and match results on the public event page

### Organizers / admins

- Create tournaments: format, mode, slots, entry fee, prize pool, rules, schedule,
  room credentials, reveal window, banner, BR match count
- Edit settings and flip status: registration → live → completed
- Approve, waitlist, reject registrations; set seeds
- Generate/regenerate seeded single-elimination brackets (with automatic byes)
- Report series scores; winner advances automatically; final sets the champion
- Enter battle-royale placement + kills per match; points and standings calculate
  automatically
- Publish and delete announcements
- Admin accounts can manage every event; organizers see their own events

### Scoring

Free Fire-style placement points + 1 point per kill:

| Placement | 1  | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
| --------- | -- | - | - | - | - | - | - | - | - | -- |
| Points    | 12 | 9 | 8 | 7 | 6 | 5 | 4 | 3 | 2 | 1  |

Ties are broken by total kills, then best placement. Placement positions must be unique
within a match.

---

## Project structure

```
.
├── client/
│   ├── src/
│   │   ├── components/     Layout, navbar, bracket, standings, UI primitives
│   │   ├── hooks/          useFetch, useNow
│   │   ├── lib/            Formatting, labels, banner themes
│   │   ├── pages/          Home, tournaments, dashboard, admin console, auth
│   │   ├── api.js          Fetch wrapper + token handling
│   │   ├── AuthContext.jsx
│   │   └── App.jsx
│   ├── index.html
│   └── vite.config.js      Dev proxy /api → localhost:4000
├── server/
│   └── src/
│       ├── routes/         auth, teams, tournaments, registrations, matches, dashboard
│       ├── auth.js         JWT, middleware, permission helpers
│       ├── bracket.js      Seeded bracket generation + advancement
│       ├── db.js           PGlite init + schema
│       ├── points.js       Placement points
│       ├── seed.js         Demo users, teams, tournaments, results
│       ├── standings.js    BR standings and match results
│       └── index.js        Express app + static frontend
├── package.json            npm workspaces + scripts
└── README.md
```

---

## Scripts

| Command                  | What it does                                        |
| ------------------------ | --------------------------------------------------- |
| `npm run dev`            | Run API (watch) and Vite dev server together        |
| `npm run dev:server`     | API only with `node --watch`                        |
| `npm run dev:client`     | Frontend only                                       |
| `npm run build`          | Build the frontend to `client/dist`                 |
| `npm start`              | Run the API and serve the built frontend            |
| `npm run seed`           | Seed if empty                                       |
| `npm run seed -- --reset`| Wipe the database and reseed demo data              |
| `npm test -w client`     | Run the React/jsdom render tests                    |

### Testing

The client has a lightweight Vitest suite that renders the main pages against mocked
API responses. It needs no browser or database:

```bash
npm test -w client
```

For an API-level check, start the server and hit `/api/health`, or run a flow script
against a throwaway database using `PGLITE_DIR` and `PORT` (never share a data
directory between two running servers).

---

## API overview

All routes are under `/api`. Protected routes use `Authorization: Bearer <token>`.

| Method | Route                                      | Purpose                              |
| ------ | ------------------------------------------ | ------------------------------------ |
| POST   | `/auth/register`                           | Create account                       |
| POST   | `/auth/login`                              | Sign in                              |
| GET    | `/auth/me`                                 | Current user                         |
| PATCH  | `/auth/me`                                 | Update name / UID / color / password |
| POST   | `/auth/me/photo`                           | Upload profile photo (multipart)      |
| DELETE | `/auth/me/photo`                           | Remove profile photo                  |
| GET    | `/users/:id`                               | Public player profile (no email)     |
| GET    | `/teams/mine`                              | Teams for current user               |
| POST   | `/teams`                                   | Create team                          |
| POST   | `/teams/join`                              | Join with invite code                |
| GET    | `/teams/:id`                               | Team, roster, tournament history     |
| GET    | `/tournaments`                             | List (`?status=live`, `?mine=1`, `?date=YYYY-MM-DD&tz=minutes`) |
| GET    | `/tournaments/:idOrSlug`                   | Full public/manager event payload    |
| POST   | `/tournaments`                             | Create (organizer/admin)             |
| PATCH  | `/tournaments/:idOrSlug`                   | Update settings/status               |
| POST   | `/tournaments/:id/register`                | Register a team (captain)            |
| GET    | `/tournaments/:id/registrations`           | Manage registrations                 |
| PATCH  | `/registrations/:id`                       | Approve / waitlist / reject / seed   |
| POST   | `/tournaments/:id/bracket`                 | Generate seeded bracket              |
| PATCH  | `/matches/:id`                             | Report series score                  |
| POST   | `/tournaments/:id/br-results`              | Publish a BR match result set        |
| POST   | `/tournaments/:id/announcements`           | Publish announcement                 |
| DELETE | `/tournaments/:id/announcements/:announcementId` | Delete announcement           |
| GET    | `/dashboard`                               | Player dashboard aggregate           |
| GET    | `/stats`                                   | Landing-page counters                |

The event detail endpoint returns tournament info, approved teams, the bracket or BR
results, standings, announcements, the caller's registrations, and a room object that
only contains credentials when the viewer is authorized and the reveal time has passed.

---

## Security / production notes

This is an MVP demo, not a production-ready money-handling platform.

- Passwords use Node's `scrypt` with per-user salts; tokens are JWTs valid for 7 days.
- Profile photos are stored on disk under `server/uploads/avatars/` with random
  server-generated filenames, capped at 2 MB (JPG/PNG/WebP only) and served
  statically at `/uploads/…` — anyone with the link can view a photo, which is
  normal for web images; there is no per-file access control.
- Tokens are stored in `localStorage` for demo simplicity. For production, prefer
  httpOnly cookies + CSRF protection.
- No email verification, password reset, rate limiting, or CAPTCHA yet.
- Payment, payouts, dispute evidence uploads, and Garena policy compliance are not
  implemented. Entry fees are informational only in this build.
- PGlite runs in-process and is single-node. For scale, move the query layer to managed
  Postgres (e.g. `pg` or Drizzle) and run multiple app instances.
- Live updates use polling; WebSockets/SSE and push notifications are roadmap items.
- The seeded "organizer" role is self-selectable at signup for demo purposes. In
  production, gate organizer activation behind manual review.

For deployment, set `JWT_SECRET`, restrict `CLIENT_ORIGIN`, put the app behind
Cloudflare/HTTPS, back up the PGlite data directory (or use Postgres), and run behind a
process manager.

---

## Roadmap

1. Payments and payouts (Razorpay/Stripe), transaction logs, refund rules
2. Google sign-in, email verification, password reset
3. Server-Sent Events or WebSockets for lobby/score updates
4. Screenshot proofs and a dispute workflow
5. Notifications (email/Discord/WhatsApp), stream embeds, sponsor banners
6. Player career stats and seasonal leaderboards
7. Managed Postgres + object storage for proof uploads
8. Garena-compliant branding review and organizer verification

---

## Trademark note

Free Fire Arena is an independent community project. It is not affiliated with,
endorsed by, or sponsored by Garena. "Free Fire" and related marks belong to their
respective owners. Replace the text-based branding with officially approved assets only
if you have permission.
