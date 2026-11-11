import { fileURLToPath } from 'node:url';
import { db, initDb, one, query } from './db.js';
import { hashPassword } from './password.js';
import { randomCode } from './helpers.js';
import { resultPoints } from './points.js';
import { generateBracket, reportMatchResult } from './bracket.js';

const COLORS = ['#ff6a00', '#4cc9f0', '#f72585', '#f9c74f', '#7bdff2', '#b5179e', '#90be6d'];

const TEAM_SEEDS = [
  {
    name: 'Phantom Squad',
    tag: 'PHTM',
    captain: 'GhostByte',
    email: 'player@freefire.gg',
    color: '#ff6a00',
    members: ['Ashveil', 'BlitzKid'],
  },
  {
    name: 'Nova Five',
    tag: 'NOVA',
    captain: 'NovaStrike',
    email: 'nova@freefire.gg',
    color: '#4cc9f0',
    members: ['Orbit', 'Pulse'],
  },
  {
    name: 'Iron Wolves',
    tag: 'IRON',
    captain: 'IronWolf',
    email: 'iron@freefire.gg',
    color: '#f9c74f',
    members: ['SteelFang', 'Howl'],
  },
  {
    name: 'Toxic Rush',
    tag: 'TOXC',
    captain: 'ToxicRush',
    email: 'toxic@freefire.gg',
    color: '#90be6d',
    members: ['Venom', 'Sludge'],
  },
  {
    name: 'Silent Storm',
    tag: 'STORM',
    captain: 'SilentStorm',
    email: 'silent@freefire.gg',
    color: '#7bdff2',
    members: ['Mist', 'Thunder'],
  },
  {
    name: 'Blaze Kings',
    tag: 'BLAZE',
    captain: 'BlazeKing',
    email: 'blaze@freefire.gg',
    color: '#f72585',
    members: ['Pyro', 'Cinder'],
  },
  {
    name: 'Raven Order',
    tag: 'RVN',
    captain: 'RavenX',
    email: 'raven@freefire.gg',
    color: '#b5179e',
    members: ['Talon', 'Onyx'],
  },
  {
    name: 'Crimson Fang',
    tag: 'FANG',
    captain: 'CrimsonFang',
    email: 'crimson@freefire.gg',
    color: '#e63946',
    members: ['Scarlet', 'Reaper'],
  },
  {
    name: 'Frost Legion',
    tag: 'FROST',
    captain: 'FrostByte',
    email: 'frost@freefire.gg',
    color: '#48cae4',
    members: ['Glacier', 'Chill'],
  },
  {
    name: 'Zero Latency',
    tag: 'ZERO',
    captain: 'ZeroLag',
    email: 'zero@freefire.gg',
    color: '#adb5bd',
    members: ['Ping', 'Buffer'],
  },
];

function daysFromNow(days, hours = 0) {
  return new Date(Date.now() + days * 86_400_000 + hours * 3_600_000);
}

async function createUser(displayName, email, role, color, uid) {
  return one(
    `INSERT INTO users (email, password_hash, display_name, ff_uid, role, avatar_color)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [email, hashPassword(role === 'admin' ? 'admin123' : role === 'organizer' ? 'organizer123' : 'player123'), displayName, uid, role, color],
  );
}

async function createTeam({ name, tag, captain, email, color, members }, index) {
  const captainUser = await createUser(
    captain,
    email,
    'player',
    color,
    String(78123400 + index * 137),
  );

  let joinCode = randomCode();
  const clash = await one('SELECT id FROM teams WHERE join_code = $1', [joinCode]);
  if (clash) joinCode = randomCode();

  const team = await one(
    `INSERT INTO teams (name, tag, captain_id, join_code) VALUES ($1, $2, $3, $4) RETURNING *`,
    [name, tag, captainUser.id, joinCode],
  );
  await query(
    `INSERT INTO team_members (team_id, user_id, role) VALUES ($1, $2, 'captain')`,
    [team.id, captainUser.id],
  );

  for (const [memberIndex, memberName] of members.entries()) {
    const member = await createUser(
      memberName,
      `member${index}${memberIndex}@freefire.gg`,
      'player',
      COLORS[(index + memberIndex + 1) % COLORS.length],
      String(78123400 + index * 137 + memberIndex + 1),
    );
    await query(
      `INSERT INTO team_members (team_id, user_id, role) VALUES ($1, $2, 'member')`,
      [team.id, member.id],
    );
  }

  return { ...team, captainUser, color };
}

async function createTournament(data) {
  return one(
    `INSERT INTO tournaments
      (slug, title, description, format, mode, status, slots, entry_fee, prize_pool,
       rules, starts_at, registration_closes, room_id, room_password,
       room_reveal_minutes, br_matches, banner, organizer_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
     RETURNING *`,
    [
      data.slug,
      data.title,
      data.description,
      data.format,
      data.mode,
      data.status,
      data.slots,
      data.entryFee || 0,
      data.prizePool || 0,
      data.rules,
      data.startsAt,
      data.registrationCloses,
      data.roomId || null,
      data.roomPassword || null,
      data.roomRevealMinutes ?? 15,
      data.brMatches ?? 4,
      data.banner,
      data.organizerId,
    ],
  );
}

async function addRegistration(tournamentId, teamId, status, seed = null) {
  return query(
    `INSERT INTO registrations (tournament_id, team_id, status, seed)
     VALUES ($1, $2, $3, $4)`,
    [tournamentId, teamId, status, seed],
  );
}

export async function seedDemo({ force = false } = {}) {
  const existing = await one('SELECT COUNT(*)::int AS count FROM users');
  if (existing.count > 0 && !force) return false;

  if (force) {
    await db.exec(`
      TRUNCATE announcements, br_results, matches, registrations,
               tournaments, team_members, teams, users
      RESTART IDENTITY CASCADE;
    `);
  }

  const organizer = await createUser(
    'Blaze Esports',
    'organizer@freefire.gg',
    'organizer',
    '#ff8a2a',
    '900100200',
  );
  await createUser(
    'Arena Admin',
    'admin@freefire.gg',
    'admin',
    '#f72585',
    '900100201',
  );

  const teams = [];
  for (const [index, seed] of TEAM_SEEDS.entries()) {
    teams.push(await createTeam(seed, index));
  }

  const byName = Object.fromEntries(teams.map((team) => [team.name, team]));
  const team = (name) => byName[name];

  const registrationRules = `1. Squad mode — four players per team, one substitute allowed.
2. No emulators, macros, or third-party tools. Mobile devices only.
3. Teaming or hacking results in immediate disqualification.
4. Check in 30 minutes before the lobby opens. Late teams forfeit their slot.
5. Record your POV and keep screenshots of every result for 48 hours.
6. Organizer decisions are final. Disputes must be raised within 15 minutes.`;

  const ember = await createTournament({
    slug: 'ember-cup-season-4',
    title: 'Ember Cup Season 4',
    description:
      'The flagship open squad cup returns. Sixteen teams fight through a single-elimination bracket for the Ember crown and a ₹25,000 prize pool. Bring your best four — only one squad leaves with the trophy.',
    format: 'single_elim',
    mode: 'squad',
    status: 'registration',
    slots: 8,
    entryFee: 0,
    prizePool: 25000,
    rules: registrationRules,
    startsAt: daysFromNow(2, 3),
    registrationCloses: daysFromNow(1, 3),
    roomId: 'EMBR2048',
    roomPassword: 'EMBER4',
    roomRevealMinutes: 15,
    banner: 'ember',
    organizerId: organizer.id,
  });

  const nightfall = await createTournament({
    slug: 'nightfall-showdown',
    title: 'Nightfall Showdown',
    description:
      'A battle royale points race under the lights. Four matches, placement points plus kills, one leaderboard. The top squad after match four takes the ₹50,000 prize pool.',
    format: 'battle_royale',
    mode: 'squad',
    status: 'live',
    slots: 12,
    entryFee: 100,
    prizePool: 50000,
    rules:
      registrationRules +
      `\n7. Placement points: 12/9/8/7/6/5/4/3/2/1 for 1st–10th. One point per kill.
8. All four matches must be played. Ties are broken by total kills.`,
    startsAt: daysFromNow(0, 1 / 6),
    registrationCloses: daysFromNow(0, -1),
    roomId: 'NIGHT777',
    roomPassword: 'FFNIGHT',
    roomRevealMinutes: 15,
    brMatches: 4,
    banner: 'night',
    organizerId: organizer.id,
  });

  const rookie = await createTournament({
    slug: 'rookie-rumble-12',
    title: 'Rookie Rumble #12',
    description:
      'The proving ground for new squads. Eight teams, one elimination bracket, and a ₹10,000 prize pool. Rookie Rumble #12 has wrapped — check the bracket to see how it played out.',
    format: 'single_elim',
    mode: 'squad',
    status: 'completed',
    slots: 8,
    entryFee: 0,
    prizePool: 10000,
    rules: registrationRules,
    startsAt: daysFromNow(-3, 2),
    registrationCloses: daysFromNow(-4),
    roomId: 'ROOK1122',
    roomPassword: 'ROOKIE',
    roomRevealMinutes: 15,
    banner: 'gold',
    organizerId: organizer.id,
  });

  const clash = await createTournament({
    slug: 'clash-of-fangs',
    title: 'Clash of Fangs',
    description:
      'High-stakes battle royale with a ₹1,00,000 prize pool and a ₹250 entry. Sixteen squads, six matches, one champion. Registration is open — slots are moving fast.',
    format: 'battle_royale',
    mode: 'squad',
    status: 'registration',
    slots: 16,
    entryFee: 250,
    prizePool: 100000,
    rules:
      registrationRules +
      `\n7. Six matches total. Placement points 12/9/8/7/6/5/4/3/2/1.
8. Entry fee is non-refundable once the lobby is seeded.`,
    startsAt: daysFromNow(3, 4),
    registrationCloses: daysFromNow(2, 4),
    roomId: 'FANGS999',
    roomPassword: 'FANGS6',
    roomRevealMinutes: 20,
    brMatches: 6,
    banner: 'toxic',
    organizerId: organizer.id,
  });

  // Ember Cup: six approved + two pending.
  const emberSeeds = [
    'Phantom Squad',
    'Nova Five',
    'Iron Wolves',
    'Toxic Rush',
    'Silent Storm',
    'Blaze Kings',
  ];
  for (const [index, name] of emberSeeds.entries()) {
    await addRegistration(ember.id, team(name).id, 'approved', index + 1);
  }
  await addRegistration(ember.id, team('Raven Order').id, 'pending');
  await addRegistration(ember.id, team('Crimson Fang').id, 'pending');

  // Nightfall: ten approved, three matches already scored.
  const nightfallTeams = teams.slice(0, 10);
  for (const [index, squad] of nightfallTeams.entries()) {
    await addRegistration(nightfall.id, squad.id, 'approved', index + 1);
  }

  for (let matchNumber = 1; matchNumber <= 3; matchNumber++) {
    const offset = (matchNumber * 3) % nightfallTeams.length;
    for (const [index, squad] of nightfallTeams.entries()) {
      const placement = ((index - offset + nightfallTeams.length) % nightfallTeams.length) + 1;
      const kills = ((index * 3 + matchNumber * 2) % 9) + 1;
      await query(
        `INSERT INTO br_results
           (tournament_id, team_id, match_number, placement, kills, points)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [nightfall.id, squad.id, matchNumber, placement, kills, resultPoints(placement, kills)],
      );
    }
  }

  // Rookie Rumble: completed eight-team bracket, higher seed wins.
  const rookieNames = [
    'Phantom Squad',
    'Nova Five',
    'Iron Wolves',
    'Toxic Rush',
    'Silent Storm',
    'Blaze Kings',
    'Raven Order',
    'Crimson Fang',
  ];
  for (const [index, name] of rookieNames.entries()) {
    await addRegistration(rookie.id, team(name).id, 'approved', index + 1);
  }
  await generateBracket(rookie.id);

  const registrations = await query(
    `SELECT team_id, seed FROM registrations WHERE tournament_id = $1`,
    [rookie.id],
  );
  const seedByTeam = new Map(registrations.map((row) => [row.team_id, row.seed]));

  let totalRounds = 0;
  for (let round = 1; round <= 3; round++) {
    totalRounds = round;
    const roundMatches = await query(
      `SELECT * FROM matches
       WHERE tournament_id = $1 AND round = $2 AND status <> 'completed'`,
      [rookie.id, round],
    );
    for (const match of roundMatches) {
      if (!match.team_a_id || !match.team_b_id) continue;
      const seedA = seedByTeam.get(match.team_a_id);
      const seedB = seedByTeam.get(match.team_b_id);
      const winnerId = seedA < seedB ? match.team_a_id : match.team_b_id;
      const winnerIsA = winnerId === match.team_a_id;
      await reportMatchResult(match.id, {
        scoreA: winnerIsA ? 3 : 1,
        scoreB: winnerIsA ? 1 : 3,
        winnerId,
      });
    }
  }

  // Clash of Fangs: four approved, two pending.
  await addRegistration(clash.id, team('Frost Legion').id, 'approved', 1);
  await addRegistration(clash.id, team('Zero Latency').id, 'approved', 2);
  await addRegistration(clash.id, team('Raven Order').id, 'approved', 3);
  await addRegistration(clash.id, team('Crimson Fang').id, 'approved', 4);
  await addRegistration(clash.id, team('Nova Five').id, 'pending');
  await addRegistration(clash.id, team('Iron Wolves').id, 'pending');

  await query(
    `INSERT INTO announcements (tournament_id, title, body) VALUES
     ($1, 'Check-in opens 60 minutes before the lobby', 'Captains must check in on the tournament page. Teams that miss check-in will lose their slot to the waitlist.'),
     ($2, 'Match 4 lobby opens soon', 'Room ID and password are now visible to approved teams on the tournament page. Join the lobby 10 minutes early.'),
     ($3, 'Rookie Rumble #12 champions', 'Phantom Squad took the trophy after a clean 3–1 run through the bracket. Full results are live.'),
     ($4, 'Slot confirmations rolling out', 'Approved squads have been seeded. Two waitlist slots remain — pending teams will be reviewed within 24 hours.')`,
    [ember.id, nightfall.id, rookie.id, clash.id],
  );

  // Keep totalRounds referenced for clarity in seed logs.
  return {
    seeded: true,
    teams: teams.length,
    tournaments: 4,
    rounds: totalRounds,
  };
}

export async function ensureSeed() {
  return seedDemo();
}

const isDirectRun = process.argv[1] === fileURLToPath(import.meta.url);
if (isDirectRun) {
  await initDb();
  const force = process.argv.includes('--reset') || process.argv.includes('--force');
  const result = await seedDemo({ force });
  console.log(
    result ? `Seed complete: ${result.teams} teams, ${result.tournaments} tournaments.` : 'Database already has data. Use --reset to wipe and reseed.',
  );
  await db.close();
}
