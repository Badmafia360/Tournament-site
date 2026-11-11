import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../AuthContext.jsx';
import { useFetch } from '../hooks/useFetch.js';
import {
  Alert,
  Avatar,
  Badge,
  EmptyState,
  PageLoader,
  Spinner,
  StatBox,
} from '../components/ui.jsx';
import { AVATAR_COLORS, formatDay } from '../lib/format.js';

export default function Profile() {
  const { user, updateUser } = useAuth();
  const { data, loading, error, refresh } = useFetch(`/users/${user?.id}`, {
    deps: [user?.id],
  });

  const [details, setDetails] = useState({
    displayName: user?.displayName || '',
    ffUid: user?.ffUid || '',
    avatarColor: user?.avatarColor || AVATAR_COLORS[0],
  });
  const [passwords, setPasswords] = useState({
    currentPassword: '',
    newPassword: '',
    confirm: '',
  });
  const [busy, setBusy] = useState('');
  const [detailsNotice, setDetailsNotice] = useState(null);
  const [passwordNotice, setPasswordNotice] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const fileRef = useRef(null);

  // Local preview of the picked file, released when replaced or unmounted.
  useEffect(() => {
    if (!photoFile || typeof URL.createObjectURL !== 'function') return undefined;
    const url = URL.createObjectURL(photoFile);
    setPhotoPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [photoFile]);

  if (loading && !data) return <PageLoader label="Loading your profile…" />;
  if (error && !data) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20">
        <Alert type="error">{error}</Alert>
      </div>
    );
  }

  const stats = data?.stats || { teams: 0, events: 0, titles: 0 };
  const teams = data?.teams || [];

  async function saveDetails(event) {
    event.preventDefault();
    setBusy('details');
    setDetailsNotice(null);
    try {
      const payload = await api.patch('/auth/me', {
        displayName: details.displayName,
        ffUid: details.ffUid,
        avatarColor: details.avatarColor,
      });
      updateUser(payload.user);
      setDetailsNotice({ type: 'success', text: 'Profile updated.' });
    } catch (err) {
      setDetailsNotice({ type: 'error', text: err.message });
    } finally {
      setBusy('');
    }
  }

  async function savePassword(event) {
    event.preventDefault();
    setBusy('password');
    setPasswordNotice(null);
    if (passwords.newPassword !== passwords.confirm) {
      setPasswordNotice({ type: 'error', text: 'New passwords do not match.' });
      setBusy('');
      return;
    }
    try {
      await api.patch('/auth/me', {
        currentPassword: passwords.currentPassword,
        newPassword: passwords.newPassword,
      });
      setPasswords({ currentPassword: '', newPassword: '', confirm: '' });
      setPasswordNotice({ type: 'success', text: 'Password changed.' });
    } catch (err) {
      setPasswordNotice({ type: 'error', text: err.message });
    } finally {
      setBusy('');
    }
  }

  async function uploadPhoto() {
    if (!photoFile) return;
    setBusy('photo');
    setDetailsNotice(null);
    try {
      const form = new FormData();
      form.append('photo', photoFile);
      const payload = await api.upload('/auth/me/photo', form);
      updateUser(payload.user);
      setPhotoFile(null);
      if (fileRef.current) fileRef.current.value = '';
      setDetailsNotice({ type: 'success', text: 'Profile photo updated.' });
    } catch (err) {
      setDetailsNotice({ type: 'error', text: err.message });
    } finally {
      setBusy('');
    }
  }

  async function removePhoto() {
    setBusy('photo');
    setDetailsNotice(null);
    try {
      const payload = await api.delete('/auth/me/photo');
      updateUser(payload.user);
      setDetailsNotice({ type: 'success', text: 'Photo removed. You now show your initials.' });
    } catch (err) {
      setDetailsNotice({ type: 'error', text: err.message });
    } finally {
      setBusy('');
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Avatar name={user.displayName} color={user.avatarColor} photo={user.avatarPhoto} size="lg" />
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-ember-500">My profile</p>
            <h1 className="font-display text-4xl font-extrabold uppercase tracking-tight text-white sm:text-5xl">
              {user.displayName}
            </h1>
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              <Badge tone="ember">{user.role}</Badge>
              {user.ffUid && (
                <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                  UID {user.ffUid}
                </span>
              )}
              <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-600">
                Since {formatDay(user.createdAt)}
              </span>
            </div>
          </div>
        </div>
        <Link to={`/players/${user.id}`} className="btn btn-ghost">
          View public profile →
        </Link>
      </div>

      <div className="mt-8 grid grid-cols-3 gap-3">
        <StatBox label="Teams" value={stats.teams} hint="Rosters you belong to" />
        <StatBox label="Events" value={stats.events} hint="Tournament entries" accent />
        <StatBox label="Titles" value={stats.titles} hint="Completed-event wins" />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
        <div className="space-y-6">
          <section className="panel p-5">
            <h2 className="font-display text-2xl font-bold uppercase tracking-wide text-white">
              Profile details
            </h2>
            <p className="mt-1 text-sm text-zinc-500">
              Your display name, game UID, and avatar color. Your email stays the same.
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-4 border-b border-white/6 pb-5">
              <Avatar
                name={user.displayName}
                color={user.avatarColor}
                photo={photoPreview || user.avatarPhoto}
                size="xl"
              />
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-500">
                  Profile photo
                </p>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  aria-label="Choose profile photo"
                  className="hidden"
                  onChange={(event) => setPhotoFile(event.target.files?.[0] || null)}
                />
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => fileRef.current?.click()}
                  >
                    {user.avatarPhoto ? 'Change photo' : 'Add photo'}
                  </button>
                  {photoFile && (
                    <>
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={uploadPhoto}
                        disabled={busy === 'photo'}
                      >
                        {busy === 'photo' ? <Spinner className="h-4 w-4" /> : 'Upload'}
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => {
                          setPhotoFile(null);
                          if (fileRef.current) fileRef.current.value = '';
                        }}
                      >
                        Cancel
                      </button>
                    </>
                  )}
                  {user.avatarPhoto && !photoFile && (
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={removePhoto}
                      disabled={busy === 'photo'}
                    >
                      {busy === 'photo' ? <Spinner className="h-4 w-4" /> : 'Remove'}
                    </button>
                  )}
                </div>
                <p className="mt-2 text-[10px] text-zinc-600">
                  JPG, PNG or WebP · max 2 MB
                  {photoFile ? ` · selected: ${photoFile.name}` : ''}
                </p>
              </div>
            </div>

            {detailsNotice && (
              <Alert type={detailsNotice.type} className="mt-4" onClose={() => setDetailsNotice(null)}>
                {detailsNotice.text}
              </Alert>
            )}

            <form onSubmit={saveDetails} className="mt-4 space-y-4">
              <div>
                <label className="label" htmlFor="profileName">Display name</label>
                <input
                  id="profileName"
                  className="field"
                  required
                  minLength={3}
                  maxLength={32}
                  value={details.displayName}
                  onChange={(event) =>
                    setDetails((current) => ({ ...current, displayName: event.target.value }))
                  }
                />
              </div>

              <div>
                <label className="label" htmlFor="profileUid">Free Fire UID</label>
                <input
                  id="profileUid"
                  className="field font-mono"
                  inputMode="numeric"
                  maxLength={15}
                  value={details.ffUid}
                  onChange={(event) =>
                    setDetails((current) => ({
                      ...current,
                      ffUid: event.target.value.replace(/\D/g, ''),
                    }))
                  }
                  placeholder="6–15 digits, or leave empty"
                />
                <p className="mt-1 text-[10px] text-zinc-600">
                  Clear the field to remove it from your profile.
                </p>
              </div>

              <div>
                <span className="label">Avatar color</span>
                <div className="mt-2 flex flex-wrap gap-2" role="radiogroup" aria-label="Avatar color">
                  {AVATAR_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      role="radio"
                      aria-checked={details.avatarColor === color}
                      aria-label={`Avatar color ${color}`}
                      onClick={() => setDetails((current) => ({ ...current, avatarColor: color }))}
                      className={`h-9 w-9 rounded-full border-2 transition ${
                        details.avatarColor === color
                          ? 'border-white scale-110'
                          : 'border-transparent hover:scale-105'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              <div className="flex justify-end">
                <button type="submit" className="btn btn-primary" disabled={busy === 'details'}>
                  {busy === 'details' ? <Spinner className="h-4 w-4" /> : 'Save details'}
                </button>
              </div>
            </form>
          </section>

          <section className="panel p-5">
            <h2 className="font-display text-2xl font-bold uppercase tracking-wide text-white">
              Change password
            </h2>
            <p className="mt-1 text-sm text-zinc-500">
              Confirm with your current password. Minimum 6 characters.
            </p>

            {passwordNotice && (
              <Alert type={passwordNotice.type} className="mt-4" onClose={() => setPasswordNotice(null)}>
                {passwordNotice.text}
              </Alert>
            )}

            <form onSubmit={savePassword} className="mt-4 space-y-4">
              <div>
                <label className="label" htmlFor="currentPassword">Current password</label>
                <input
                  id="currentPassword"
                  type="password"
                  className="field"
                  required
                  autoComplete="current-password"
                  value={passwords.currentPassword}
                  onChange={(event) =>
                    setPasswords((current) => ({
                      ...current,
                      currentPassword: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="label" htmlFor="newPassword">New password</label>
                  <input
                    id="newPassword"
                    type="password"
                    className="field"
                    required
                    minLength={6}
                    autoComplete="new-password"
                    value={passwords.newPassword}
                    onChange={(event) =>
                      setPasswords((current) => ({ ...current, newPassword: event.target.value }))
                    }
                  />
                </div>
                <div>
                  <label className="label" htmlFor="confirmPassword">Confirm new password</label>
                  <input
                    id="confirmPassword"
                    type="password"
                    className="field"
                    required
                    minLength={6}
                    autoComplete="new-password"
                    value={passwords.confirm}
                    onChange={(event) =>
                      setPasswords((current) => ({ ...current, confirm: event.target.value }))
                    }
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <button type="submit" className="btn btn-ghost" disabled={busy === 'password'}>
                  {busy === 'password' ? <Spinner className="h-4 w-4" /> : 'Change password'}
                </button>
              </div>
            </form>
          </section>
        </div>

        <section>
          <div className="mb-3 flex items-end justify-between gap-3">
            <h2 className="font-display text-2xl font-bold uppercase tracking-wide text-white">My teams</h2>
            <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-600">
              {teams.length} roster{teams.length === 1 ? '' : 's'}
            </span>
          </div>

          {teams.length ? (
            <div className="space-y-3">
              {teams.map((team) => (
                <Link key={team.id} to={`/teams/${team.id}`} className="panel panel-hover block p-4">
                  <p className="truncate font-display text-lg font-bold uppercase tracking-wide text-white hover:text-ember-300">
                    {team.name}
                  </p>
                  <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-500">
                    {team.tag || 'NO TAG'} · {team.memberCount} players
                  </p>
                  <div className="mt-2">
                    <Badge tone={team.memberRole === 'captain' ? 'ember' : 'neutral'}>
                      {team.memberRole === 'captain' ? 'Captain' : 'Member'}
                    </Badge>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState
              icon="◇"
              title="No team yet"
              description="Create a squad or join one with an invite code from your dashboard."
            />
          )}
        </section>
      </div>
    </div>
  );
}
