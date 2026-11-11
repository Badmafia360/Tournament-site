import { useState } from 'react';
import { initials } from '../lib/format.js';

const TONES = {
  live: 'border-live/40 bg-live/10 text-rose-300',
  registration: 'border-emerald-500/35 bg-emerald-500/10 text-emerald-300',
  completed: 'border-white/15 bg-white/5 text-zinc-400',
  draft: 'border-white/10 bg-white/5 text-zinc-500',
  pending: 'border-amber-500/35 bg-amber-500/10 text-amber-300',
  approved: 'border-emerald-500/35 bg-emerald-500/10 text-emerald-300',
  rejected: 'border-rose-500/35 bg-rose-500/10 text-rose-300',
  waitlist: 'border-sky-500/35 bg-sky-500/10 text-sky-300',
  ember: 'border-ember-500/40 bg-ember-500/10 text-ember-300',
  neutral: 'border-white/10 bg-white/5 text-zinc-300',
};

export function Badge({ children, tone = 'neutral', dot = false, className = '' }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] ${TONES[tone] || TONES.neutral} ${className}`}
    >
      {dot && (tone === 'live' ? <span className="live-dot" /> : <span className="h-1.5 w-1.5 rounded-full bg-current" />)}
      {children}
    </span>
  );
}

export function Avatar({ name, color = '#ff6a00', size = 'md', photo, className = '' }) {
  const sizes = {
    sm: 'h-8 w-8 text-[10px]',
    md: 'h-10 w-10 text-xs',
    lg: 'h-14 w-14 text-base',
    xl: 'h-20 w-20 text-xl',
  };
  const [failed, setFailed] = useState(false);

  if (photo && !failed) {
    return (
      <img
        src={photo}
        alt={name}
        title={name}
        onError={() => setFailed(true)}
        className={`inline-flex shrink-0 rounded-full object-cover ring-1 ring-white/20 ${sizes[size]} ${className}`}
      />
    );
  }

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-bold text-black ring-1 ring-white/20 ${sizes[size]} ${className}`}
      style={{ backgroundColor: color }}
      title={name}
    >
      {initials(name)}
    </span>
  );
}

export function Spinner({ className = 'h-5 w-5' }) {
  return (
    <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  );
}

export function PageLoader({ label = 'Loading the arena…' }) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 text-zinc-500">
      <Spinner className="h-8 w-8 text-ember-500" />
      <p className="text-xs font-semibold uppercase tracking-[0.2em]">{label}</p>
    </div>
  );
}

export function Alert({ type = 'info', children, onClose, className = '' }) {
  if (!children) return null;
  const styles = {
    error: 'border-rose-500/30 bg-rose-500/10 text-rose-200',
    success: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200',
    info: 'border-sky-500/30 bg-sky-500/10 text-sky-200',
    warning: 'border-amber-500/30 bg-amber-500/10 text-amber-200',
  };
  return (
    <div className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-sm ${styles[type]} ${className}`}>
      <span className="mt-0.5 text-xs">●</span>
      <div className="flex-1">{children}</div>
      {onClose && (
        <button type="button" onClick={onClose} className="text-xs opacity-60 hover:opacity-100">
          ✕
        </button>
      )}
    </div>
  );
}

export function EmptyState({ title, description, action, icon = '◇' }) {
  return (
    <div className="panel flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/5 text-xl text-ember-400">
        {icon}
      </div>
      <h3 className="font-display text-2xl font-bold uppercase tracking-wide text-white">{title}</h3>
      {description && <p className="max-w-md text-sm text-zinc-500">{description}</p>}
      {action}
    </div>
  );
}

export function CopyButton({ value, label = 'Copy', className = '' }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      const input = document.createElement('textarea');
      input.value = value;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  return (
    <button
      type="button"
      onClick={copy}
      className={`inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-300 transition hover:border-ember-500/40 hover:text-ember-300 ${className}`}
    >
      {copied ? 'Copied' : label}
    </button>
  );
}

export function SectionHeading({ kicker, title, description, action, className = '' }) {
  return (
    <div className={`flex flex-wrap items-end justify-between gap-4 ${className}`}>
      <div>
        {kicker && (
          <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.3em] text-ember-500">{kicker}</p>
        )}
        <h2 className="font-display text-3xl font-extrabold uppercase tracking-wide text-white sm:text-4xl">
          {title}
        </h2>
        {description && <p className="mt-2 max-w-2xl text-sm text-zinc-500">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function StatBox({ label, value, hint, accent = false }) {
  return (
    <div className="panel px-4 py-4">
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-500">{label}</p>
      <p className={`mt-1 font-display text-3xl font-extrabold ${accent ? 'text-ember-400' : 'text-white'}`}>
        {value}
      </p>
      {hint && <p className="mt-0.5 text-[11px] text-zinc-500">{hint}</p>}
    </div>
  );
}

export function SkeletonCards({ count = 3 }) {
  return (
    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="panel overflow-hidden">
          <div className="skeleton h-28 w-full rounded-none" />
          <div className="space-y-3 p-5">
            <div className="skeleton h-3 w-24" />
            <div className="skeleton h-6 w-3/4" />
            <div className="skeleton h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function Modal({ open, onClose, title, children, wide = false }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close modal"
        className="absolute inset-0 bg-black/75 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className={`panel relative z-10 w-full ${wide ? 'max-w-2xl' : 'max-w-md'} p-6 shadow-2xl`}
      >
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="font-display text-2xl font-bold uppercase tracking-wide text-white">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-xs text-zinc-400 hover:text-white"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
