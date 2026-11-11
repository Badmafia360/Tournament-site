// Same palette the server accepts for avatar colors (routes/auth.js).
export const AVATAR_COLORS = ['#ff6a00', '#ffb056', '#4cc9f0', '#f72585', '#7bdff2', '#b5179e', '#f9c74f'];

export function formatMoney(amount) {
  return `₹${Number(amount || 0).toLocaleString('en-IN')}`;
}

export function entryLabel(amount) {
  return Number(amount) > 0 ? formatMoney(amount) : 'Free entry';
}

export function formatDate(iso, { withYear = false } = {}) {
  if (!iso) return 'TBA';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'TBA';
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    ...(withYear ? { year: 'numeric' } : {}),
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

export function formatDay(iso) {
  if (!iso) return 'TBA';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'TBA';
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

export function formatTime(iso) {
  if (!iso) return '--:--';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '--:--';
  return new Intl.DateTimeFormat('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

/** Local calendar-day key (YYYY-MM-DD) used to group events by day. */
export function dayKey(iso) {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  const pad = (value) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Today / Tomorrow / Yesterday, else "Fri, 14 Nov" (adds the year when not current). */
export function dayLabel(key) {
  if (!key) return 'Date TBA';
  const [year, month, day] = key.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  if (Number.isNaN(date.getTime())) return 'Date TBA';

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.round((date.getTime() - today.getTime()) / 86_400_000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays === -1) return 'Yesterday';

  return new Intl.DateTimeFormat('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    ...(year !== today.getFullYear() ? { year: 'numeric' } : {}),
  }).format(date);
}

/** Weekday initial for the schedule rail, e.g. "FRI". */
export function dayWeekday(key) {
  if (!key) return '—';
  const [year, month, day] = key.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('en-IN', { weekday: 'short' })
    .format(date)
    .toUpperCase();
}

/** "14 Nov" compact date used in the create-form day hint. */
export function formatDayShort(key) {
  if (!key) return '';
  const [year, month, day] = key.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
  }).format(date);
}

export function countdownParts(iso) {
  if (!iso) return null;
  const target = new Date(iso).getTime();
  if (Number.isNaN(target)) return null;
  const diff = target - Date.now();
  const expired = diff <= 0;
  const total = Math.max(0, diff);
  return {
    expired,
    days: Math.floor(total / 86_400_000),
    hours: Math.floor((total % 86_400_000) / 3_600_000),
    minutes: Math.floor((total % 3_600_000) / 60_000),
    seconds: Math.floor((total % 60_000) / 1000),
  };
}

export function formatCountdown(parts, { compact = false } = {}) {
  if (!parts) return 'TBA';
  if (parts.expired) return 'Live now';
  const { days, hours, minutes } = parts;
  if (days > 0) return `${days}d ${hours}h ${compact ? '' : `${minutes}m`}`.trim();
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export function roundLabel(round, totalRounds) {
  if (round === totalRounds) return 'Final';
  if (round === totalRounds - 1) return 'Semifinals';
  if (round === totalRounds - 2) return 'Quarterfinals';
  return `Round ${round}`;
}

export function formatLabel(format) {
  if (format === 'single_elim') return 'Single Elimination';
  if (format === 'battle_royale') return 'Battle Royale';
  return format;
}

export function formatShort(format) {
  if (format === 'single_elim') return 'Bracket';
  if (format === 'battle_royale') return 'Points';
  return format;
}

export function modeLabel(mode) {
  return { solo: 'Solo', duo: 'Duo', squad: 'Squad' }[mode] || mode;
}

export function statusLabel(status) {
  return (
    {
      draft: 'Draft',
      registration: 'Registration open',
      live: 'Live',
      completed: 'Completed',
      pending: 'Pending review',
      approved: 'Approved',
      rejected: 'Rejected',
      waitlist: 'Waitlist',
    }[status] || status
  );
}

export function initials(name = '') {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase() || 'FF';
}

export function toDateTimeInput(iso) {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (value) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`;
}

export function defaultStartInput() {
  const date = new Date(Date.now() + 86_400_000);
  date.setHours(20, 0, 0, 0);
  return toDateTimeInput(date.toISOString());
}

export const BANNERS = {
  ember: {
    label: 'Ember',
    className: 'from-orange-600/80 via-rose-700/35 to-ink-950',
    accent: '#ff6a00',
  },
  night: {
    label: 'Nightfall',
    className: 'from-indigo-600/75 via-violet-800/40 to-ink-950',
    accent: '#818cf8',
  },
  gold: {
    label: 'Gold',
    className: 'from-amber-500/75 via-orange-700/35 to-ink-950',
    accent: '#fbbf24',
  },
  toxic: {
    label: 'Toxic',
    className: 'from-lime-500/65 via-emerald-800/40 to-ink-950',
    accent: '#84cc16',
  },
};

export function bannerFor(key) {
  return BANNERS[key] || BANNERS.ember;
}
