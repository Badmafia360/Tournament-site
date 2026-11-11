import { describe, expect, test, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from './App.jsx';
import { AuthProvider } from './AuthContext.jsx';
import { Avatar } from './components/ui.jsx';

const now = Date.now();
const iso = (days) => new Date(now + days * 86_400_000).toISOString();

const organizer = {
  id: 2,
  email: 'organizer@freefire.gg',
  displayName: 'Blaze Esports',
  ffUid: '900100200',
  role: 'organizer',
  avatarColor: '#ff8a2a',
  avatarPhoto: '/uploads/avatars/2-demo.jpg',
};

const ember = {
  id: 1,
  slug: 'ember-cup-season-4',
  title: 'Ember Cup Season 4',
  description: 'The flagship open squad cup with a seeded bracket.',
  format: 'single_elim',
  mode: 'squad',
  status: 'registration',
  slots: 8,
  entryFee: 0,
  prizePool: 25000,
  startsAt: iso(2),
  registrationCloses: iso(1),
  banner: 'ember',
  brMatches: 4,
  organizerId: 2,
  organizerName: 'Blaze Esports',
  approvedCount: 6,
  pendingCount: 1,
};

const nightfall = {
  id: 2,
  slug: 'nightfall-showdown',
  title: 'Nightfall Showdown',
  description: 'A battle royale points race under the lights.',
  format: 'battle_royale',
  mode: 'squad',
  status: 'live',
  slots: 12,
  entryFee: 100,
  prizePool: 50000,
  startsAt: iso(0.01),
  registrationCloses: iso(-1),
  banner: 'night',
  brMatches: 4,
  organizerId: 2,
  organizerName: 'Blaze Esports',
  approvedCount: 10,
  pendingCount: 0,
};

const approvedTeams = [
  { id: 1, name: 'Phantom Squad', tag: 'PHTM', seed: 1, captainName: 'GhostByte', memberCount: 3 },
  { id: 2, name: 'Nova Five', tag: 'NOVA', seed: 2, captainName: 'NovaStrike', memberCount: 3 },
];

function detailFor(tournament, extra = {}) {
  return {
    tournament: {
      ...tournament,
      rules: '1. Squad mode.\n2. Mobile devices only.',
      roomRevealMinutes: 15,
      organizerId: 2,
    },
    approvedTeams,
    myRegistrations: [],
    bracket: [],
    champion: null,
    standings: [],
    brResults: [],
    pointsTable: [],
    announcements: [],
    room: {
      eligible: false,
      revealed: false,
      revealAt: iso(1),
      startsAt: tournament.startsAt,
      roomId: null,
      roomPassword: null,
    },
    canManage: false,
    ...extra,
  };
}

const emberDetail = detailFor(ember, {
  announcements: [
    {
      id: 1,
      title: 'Check-in opens 60 minutes before the lobby',
      body: 'Captains must check in on the event page.',
      createdAt: iso(0),
    },
  ],
});

const nightfallDetail = detailFor(nightfall, {
  standings: [
    {
      rank: 1,
      teamId: 1,
      name: 'Phantom Squad',
      tag: 'PHTM',
      points: 50,
      kills: 10,
      matchesPlayed: 3,
      wins: 2,
      bestPlacement: 1,
    },
    {
      rank: 2,
      teamId: 2,
      name: 'Nova Five',
      tag: 'NOVA',
      points: 41,
      kills: 8,
      matchesPlayed: 3,
      wins: 1,
      bestPlacement: 2,
    },
  ],
  brResults: [
    {
      matchNumber: 1,
      results: [
        { teamId: 1, name: 'Phantom Squad', tag: 'PHTM', placement: 1, kills: 5, points: 17 },
      ],
    },
  ],
});

const registrations = [
  {
    id: 10,
    tournamentId: 1,
    teamId: 1,
    teamName: 'Phantom Squad',
    teamTag: 'PHTM',
    captainName: 'GhostByte',
    captainUid: '78123400',
    memberCount: 3,
    status: 'pending',
    seed: null,
    createdAt: iso(0),
  },
];

const dashboard = {
  teams: [
    {
      id: 1,
      name: 'Phantom Squad',
      tag: 'PHTM',
      captainId: 2,
      captainName: 'GhostByte',
      joinCode: 'ABC123',
      memberCount: 2,
      members: [
        { id: 2, displayName: 'GhostByte', role: 'captain', avatarColor: '#ff6a00', ffUid: '78123400' },
        { id: 3, displayName: 'Ashveil', role: 'member', avatarColor: '#4cc9f0', ffUid: '78123401' },
      ],
    },
  ],
  registrations: [
    {
      id: 1,
      status: 'approved',
      seed: 1,
      teamId: 1,
      teamName: 'Phantom Squad',
      teamTag: 'PHTM',
      tournamentId: 2,
      slug: 'nightfall-showdown',
      title: 'Nightfall Showdown',
      tournamentStatus: 'live',
      startsAt: iso(0.01),
      format: 'battle_royale',
      mode: 'squad',
      banner: 'night',
      prizePool: 50000,
      slots: 12,
      room: {
        revealed: true,
        revealAt: iso(0),
        roomId: 'NIGHT777',
        roomPassword: 'FFNIGHT',
      },
    },
  ],
  matches: [
    {
      id: 3,
      round: 1,
      position: 0,
      status: 'ready',
      tournamentId: 2,
      slug: 'nightfall-showdown',
      title: 'Nightfall Showdown',
      banner: 'night',
      teamAId: 1,
      teamBId: 2,
      teamAName: 'Phantom Squad',
      teamBName: 'Nova Five',
    },
  ],
};

const adminDetail = detailFor(ember, {
  canManage: true,
  registrations,
  bracket: [],
});

const routes = {
  '/auth/me': { user: organizer },
  '/users/1': {
    player: {
      id: 1,
      displayName: 'GhostByte',
      ffUid: '78123400',
      role: 'player',
      avatarColor: '#ff6a00',
      createdAt: iso(-30),
    },
    teams: [
      { id: 1, name: 'Phantom Squad', tag: 'PHTM', captainId: 2, memberRole: 'member', memberCount: 2 },
    ],
    history: [
      {
        registrationStatus: 'approved',
        seed: 1,
        tournamentId: 2,
        slug: 'nightfall-showdown',
        title: 'Nightfall Showdown',
        tournamentStatus: 'live',
        startsAt: iso(0.01),
        format: 'battle_royale',
        mode: 'squad',
        banner: 'night',
        prizePool: 50000,
        teamName: 'Phantom Squad',
        teamTag: 'PHTM',
      },
    ],
    stats: { teams: 1, events: 1, titles: 0 },
  },
  '/users/2': {
    player: {
      id: 2,
      displayName: 'Blaze Esports',
      ffUid: '900100200',
      role: 'organizer',
      avatarColor: '#ff8a2a',
      avatarPhoto: '/uploads/avatars/2-demo.jpg',
      createdAt: iso(-60),
    },
    teams: [
      { id: 1, name: 'Phantom Squad', tag: 'PHTM', captainId: 2, memberRole: 'captain', memberCount: 2 },
    ],
    history: [],
    stats: { teams: 1, events: 2, titles: 1 },
  },
  '/stats': { players: 32, teams: 10, tournaments: 4, prizePool: 185000, registrations: 24 },
  '/tournaments': { tournaments: [nightfall, ember] },
  '/tournaments?mine=1': { tournaments: [nightfall, ember] },
  '/tournaments?scope=all': { tournaments: [nightfall, ember] },
  '/tournaments/ember-cup-season-4': emberDetail,
  '/tournaments/nightfall-showdown': nightfallDetail,
  '/tournaments/1': adminDetail,
  '/dashboard': dashboard,
  '/teams/mine': { teams: dashboard.teams },
};

function setupFetch(overrides = {}) {
  global.fetch = async (input) => {
    const url = new URL(String(input), 'http://localhost');
    const path = url.pathname.replace(/^\/api/, '') + url.search;
    const data = overrides[path] ?? routes[path] ?? routes[url.pathname.replace(/^\/api/, '')];
    if (!data) {
      return new Response(JSON.stringify({ error: 'Not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };
}

function renderAt(path, { token } = {}) {
  if (token) localStorage.setItem('ff_arena_token', token);
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe('Free Fire Arena UI', () => {
  beforeEach(() => {
    setupFetch();
  });

  test('renders the landing page with featured tournaments and stats', async () => {
    renderAt('/');
    expect(await screen.findByText(/Tournaments on the board/i)).toBeInTheDocument();
    expect(screen.getAllByText('Ember Cup Season 4').length).toBeGreaterThan(0);
    expect(screen.getByText('Players')).toBeInTheDocument();
  });

  test('renders the tournament browser grouped by day', async () => {
    renderAt('/tournaments');
    expect(await screen.findByRole('heading', { name: 'Tournaments', level: 1 })).toBeInTheDocument();
    expect(screen.getAllByText('Nightfall Showdown').length).toBeGreaterThan(0);
    // Day headers are part of the schedule layout.
    expect(screen.getAllByText(/events?$/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/^\d{2}\/\d{2}$/).length).toBeGreaterThan(0);
  });

  test('groups multiple events on the same day under one header', async () => {
    const evening = new Date();
    evening.setHours(18, 0, 0, 0);
    const later = new Date(evening.getTime() + 3 * 3600_000);
    setupFetch({
      '/tournaments': {
        tournaments: [
          { ...ember, id: 11, slug: 'evening-cup', title: 'Evening Cup', startsAt: evening.toISOString() },
          { ...ember, id: 12, slug: 'night-cup', title: 'Night Cup', startsAt: later.toISOString() },
        ],
      },
    });
    renderAt('/tournaments');
    expect(await screen.findByText('Evening Cup')).toBeInTheDocument();
    expect(screen.getByText('Night Cup')).toBeInTheDocument();
    expect(screen.getByText('2 events')).toBeInTheDocument();
  });

  test('lets organizers toggle to only the events they created', async () => {
    renderAt('/tournaments', { token: 'demo-token' });
    expect(await screen.findByRole('heading', { name: 'Tournaments', level: 1 })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /My events/i }));
    expect(await screen.findByText('Showing only events you created')).toBeInTheDocument();
    expect(screen.getAllByText('Created by you').length).toBeGreaterThan(0);
  });

  test('renders a single-elimination event page', async () => {
    renderAt('/tournaments/ember-cup-season-4');
    expect(await screen.findByRole('heading', { name: 'Ember Cup Season 4' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Join event' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Sign in to join' })).toBeInTheDocument();
    // Same-day siblings surface in the sidebar (second fetch).
    expect(await screen.findByRole('heading', { name: 'Also this day' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Teams' }));
    expect(await screen.findByText('Phantom Squad')).toBeInTheDocument();
  });

  test('renders battle royale standings and match results', async () => {
    renderAt('/tournaments/nightfall-showdown');
    expect(await screen.findByRole('heading', { name: 'Nightfall Showdown' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Standings' }));
    expect(await screen.findByText(/Live standings/i)).toBeInTheDocument();
    expect(screen.getByText('50')).toBeInTheDocument();
    expect(screen.getByText('Match 1')).toBeInTheDocument();
  });

  test('renders login and register screens', async () => {
    const { unmount } = renderAt('/login');
    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
    expect(screen.getByText('Demo accounts')).toBeInTheDocument();
    unmount();

    renderAt('/register');
    expect(await screen.findByRole('heading', { name: 'Create account' })).toBeInTheDocument();
    expect(screen.getByLabelText(/Display name/i)).toBeInTheDocument();
  });

  test('renders the player dashboard with teams, rooms, and matches', async () => {
    renderAt('/dashboard', { token: 'demo-token' });
    expect(await screen.findByText('Phantom Squad')).toBeInTheDocument();
    expect(screen.getByText('My registrations')).toBeInTheDocument();
    expect(screen.getByText('Room unlocked')).toBeInTheDocument();
    expect(screen.getAllByText('Upcoming matches').length).toBeGreaterThan(0);
    expect(screen.getAllByText('NIGHT777').length).toBeGreaterThan(0);
    // Both roster forms require the player's game UID (create + join).
    expect(screen.getAllByLabelText('Free Fire UID')).toHaveLength(2);
    expect(screen.getByRole('button', { name: 'Join' })).toBeInTheDocument();
  });

  test('renders my profile page with editable details and password forms', async () => {
    renderAt('/profile', { token: 'demo-token' });
    expect(await screen.findByRole('heading', { name: 'Profile details' })).toBeInTheDocument();
    expect(screen.getByLabelText('Display name')).toHaveValue('Blaze Esports');
    expect(screen.getByLabelText('Free Fire UID')).toHaveValue('900100200');
    expect(screen.getAllByRole('radio', { name: /Avatar color/i })).toHaveLength(7);
    expect(screen.getByRole('heading', { name: 'Change password' })).toBeInTheDocument();
    expect(screen.getByLabelText('Current password')).toBeInTheDocument();
    expect(screen.getByLabelText('Confirm new password')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /View public profile/i })).toHaveAttribute(
      'href',
      '/players/2',
    );
  });

  test('renders a public player profile with teams and history', async () => {
    renderAt('/players/1');
    expect(await screen.findByRole('heading', { name: 'GhostByte', level: 1 })).toBeInTheDocument();
    expect(screen.getByText('UID 78123400')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Tournament history' })).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /Phantom Squad/ }).length).toBeGreaterThan(0);
    // Anonymous visitor: no edit button.
    expect(screen.queryByRole('link', { name: 'Edit profile' })).not.toBeInTheDocument();
  });

  test('navbar avatar links to the profile page', async () => {
    renderAt('/', { token: 'demo-token' });
    expect(await screen.findByRole('link', { name: 'My profile' })).toHaveAttribute('href', '/profile');
  });

  test('avatar renders a photo and falls back to initials without one', () => {
    const { rerender } = render(<Avatar name="GhostByte" photo="/uploads/avatars/3-x.jpg" />);
    expect(screen.getByRole('img', { name: 'GhostByte' })).toHaveAttribute(
      'src',
      '/uploads/avatars/3-x.jpg',
    );

    rerender(<Avatar name="GhostByte" />);
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.getByTitle('GhostByte')).toHaveTextContent('G');
  });

  test('offers photo upload controls on the profile page', async () => {
    renderAt('/profile', { token: 'demo-token' });
    expect(await screen.findByRole('button', { name: 'Change photo' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Remove' })).toBeInTheDocument();
    expect(screen.getByLabelText('Choose profile photo')).toBeInTheDocument();
    expect(screen.getByText(/JPG, PNG or WebP · max 2 MB/)).toBeInTheDocument();
    // Photo shows in the page header and the photo card preview.
    expect(screen.getAllByRole('img', { name: 'Blaze Esports' }).length).toBeGreaterThanOrEqual(2);
  });

  test('walks through the create tournament wizard', async () => {
    renderAt('/admin/tournaments/new', { token: 'demo-token' });
    expect(await screen.findByRole('heading', { name: 'Create tournament' })).toBeInTheDocument();

    // Step 1 blocks an empty title.
    fireEvent.click(screen.getByRole('button', { name: /Next/ }));
    expect(await screen.findByText(/at least 3 characters/i)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Tournament title/i), {
      target: { value: 'Rookie Rumble #13' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Next/ }));
    expect(await screen.findByRole('heading', { name: 'Schedule & money' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Next/ }));
    expect(await screen.findByRole('heading', { name: 'Room & branding' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Next/ }));
    expect(await screen.findByRole('heading', { name: 'Review & create' })).toBeInTheDocument();
    expect(screen.getAllByText('Rookie Rumble #13').length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: /Create tournament/i })).toBeInTheDocument();
  });

  test('renders the organizer console and tournament settings', async () => {
    renderAt('/admin', { token: 'demo-token' });
    expect(await screen.findByRole('heading', { name: 'Event control' })).toBeInTheDocument();
    expect(screen.getAllByText('Ember Cup Season 4').length).toBeGreaterThan(0);
  });

  test('renders registrations in the tournament manager', async () => {
    renderAt('/admin/tournaments/1', { token: 'demo-token' });
    expect(await screen.findByText('Event settings')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Registrations/i }));
    expect(await screen.findByText(/GhostByte/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Approve' })).toBeInTheDocument();
  });

  test('shows a not-found page for unknown routes', async () => {
    renderAt('/this-does-not-exist');
    expect(await screen.findByRole('heading', { name: 'Off the map' })).toBeInTheDocument();
  });
});
