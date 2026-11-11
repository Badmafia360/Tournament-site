function maybeJson(value) {
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return [];
    }
  }
  return value || [];
}

export function mapTeam(row) {
  return {
    id: row.id,
    name: row.name,
    tag: row.tag,
    captainId: row.captain_id,
    captainName: row.captain_name || null,
    joinCode: row.join_code,
    memberCount: row.member_count != null ? Number(row.member_count) : undefined,
    members: Array.isArray(row.members) || typeof row.members === 'string'
      ? maybeJson(row.members).map((m) => ({
          id: m.id,
          displayName: m.displayName,
          ffUid: m.ffUid,
          role: m.role,
          avatarColor: m.avatarColor,
          avatarPhoto: m.avatarPhoto ?? null,
        }))
      : undefined,
    createdAt: row.created_at,
  };
}

export function tournamentSummary(row) {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    format: row.format,
    mode: row.mode,
    status: row.status,
    slots: row.slots,
    entryFee: row.entry_fee,
    prizePool: row.prize_pool,
    startsAt: row.starts_at,
    registrationCloses: row.registration_closes,
    banner: row.banner,
    brMatches: row.br_matches,
    organizerId: row.organizer_id ?? null,
    organizerName: row.organizer_name || null,
    approvedCount:
      row.approved_count != null ? Number(row.approved_count) : undefined,
    pendingCount:
      row.pending_count != null ? Number(row.pending_count) : undefined,
  };
}

export function tournamentDetail(row) {
  return {
    ...tournamentSummary(row),
    rules: row.rules,
    roomRevealMinutes: row.room_reveal_minutes,
    organizerId: row.organizer_id,
  };
}

export function mapMatch(row) {
  return {
    id: row.id,
    tournamentId: row.tournament_id,
    round: row.round,
    position: row.position,
    teamA: row.team_a_id
      ? { id: row.team_a_id, name: row.team_a_name, tag: row.team_a_tag }
      : null,
    teamB: row.team_b_id
      ? { id: row.team_b_id, name: row.team_b_name, tag: row.team_b_tag }
      : null,
    scoreA: row.score_a,
    scoreB: row.score_b,
    winnerId: row.winner_id,
    winnerName: row.winner_name || null,
    status: row.status,
    scheduledAt: row.scheduled_at,
  };
}

export function mapRegistration(row) {
  return {
    id: row.id,
    tournamentId: row.tournament_id,
    teamId: row.team_id,
    teamName: row.team_name,
    teamTag: row.team_tag,
    captainName: row.captain_name,
    captainUid: row.captain_uid,
    memberCount: row.member_count != null ? Number(row.member_count) : undefined,
    status: row.status,
    seed: row.seed,
    createdAt: row.created_at,
  };
}
