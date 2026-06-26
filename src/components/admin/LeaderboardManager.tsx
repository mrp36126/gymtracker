'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatDistanceKm, formatDuration, getLeaderboardMetricType } from '@/lib/leaderboard';
import { parseMeters, parseTimeMMSS } from '@/lib/metrics-format';

type ManagedUser = {
  id: string;
  name: string;
  email: string;
};

type ManagedExercise = {
  id: string;
  name: string;
  muscleGroup: string;
};

type ManagedEntry = {
  id: string;
  weight: number;
  sets: number;
  reps: number;
  durationSeconds: number | null;
  distanceKm: number | null;
  notes: string | null;
  loggedAt: string;
  user: ManagedUser;
  exercise: Pick<ManagedExercise, 'id' | 'name'>;
};

type Props = {
  initialEntries: ManagedEntry[];
  users: ManagedUser[];
  exercises: ManagedExercise[];
};

type FormState = {
  id: string;
  userId: string;
  exerciseId: string;
  loggedAt: string;
  sets: string;
  reps: string;
  weight: string;
  distanceKm: string;
  duration: string;
  notes: string;
};

const emptyForm: FormState = {
  id: '',
  userId: '',
  exerciseId: '',
  loggedAt: '',
  sets: '1',
  reps: '',
  weight: '',
  distanceKm: '',
  duration: '',
  notes: '',
};

function toDateTimeLocal(value: string | Date) {
  const date = new Date(value);
  const offsetMs = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

function formatEntrySummary(entry: ManagedEntry) {
  const metricType = getLeaderboardMetricType(entry.exercise.name);
  if (metricType === 'endurance') {
    return `${formatDistanceKm(entry.distanceKm, entry.exercise.name)} / ${formatDuration(entry.durationSeconds)}`;
  }

  const volume = entry.weight * entry.sets * entry.reps;
  return `${entry.weight.toLocaleString()} kg x ${entry.reps} reps · ${volume.toLocaleString()} volume`;
}

export default function LeaderboardManager({ initialEntries, users, exercises }: Props) {
  const router = useRouter();
  const [entries, setEntries] = useState(initialEntries);
  const [form, setForm] = useState<FormState>({
    ...emptyForm,
    userId: users[0]?.id ?? '',
    exerciseId: exercises[0]?.id ?? '',
    loggedAt: toDateTimeLocal(new Date()),
  });
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(1);

  const selectedExercise = exercises.find((exercise) => exercise.id === form.exerciseId);
  const selectedMetricType = selectedExercise ? getLeaderboardMetricType(selectedExercise.name) : 'strength';

  const filteredEntries = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return entries;

    return entries.filter((entry) => [
      entry.user.name,
      entry.user.email,
      entry.exercise.name,
      entry.notes ?? '',
    ].join(' ').toLowerCase().includes(normalized));
  }, [entries, query]);
  const pageSize = 20;
  const totalPages = Math.max(1, Math.ceil(filteredEntries.length / pageSize));
  const visibleEntries = filteredEntries.slice((page - 1) * pageSize, page * pageSize);

  const refreshEntries = async () => {
    const response = await fetch('/api/leaderboard/entries', { cache: 'no-store' });
    const json = await response.json();
    if (!response.ok) throw new Error(json.error || 'Unable to refresh leaderboard entries');
    setEntries(json.data.entries);
    router.refresh();
  };

  const resetForm = () => {
    setForm({
      ...emptyForm,
      userId: users[0]?.id ?? '',
      exerciseId: exercises[0]?.id ?? '',
      loggedAt: toDateTimeLocal(new Date()),
    });
  };

  const editEntry = (entry: ManagedEntry) => {
    setForm({
      id: entry.id,
      userId: entry.user.id,
      exerciseId: entry.exercise.id,
      loggedAt: toDateTimeLocal(entry.loggedAt),
      sets: String(entry.sets),
      reps: String(entry.reps),
      weight: String(entry.weight),
      distanceKm: entry.distanceKm ? String(entry.distanceKm) : '',
      duration: entry.durationSeconds ? formatDuration(entry.durationSeconds) : '',
      notes: entry.notes ?? '',
    });
    setStatus('');
    setError('');
  };

  const saveEntry = async () => {
    setSaving(true);
    setStatus('');
    setError('');

    try {
      const durationSeconds = form.duration ? parseTimeMMSS(form.duration) : null;
      const distanceMeters = form.distanceKm ? parseMeters(form.distanceKm) : null;

      if (form.duration && durationSeconds === null) {
        throw new Error('Time must be entered as mm:ss (example: 12:45)');
      }

      if (form.distanceKm && distanceMeters === null) {
        throw new Error('Distance must be a positive number in meters');
      }

      if (selectedMetricType === 'endurance') {
        if (distanceMeters === null || durationSeconds === null) {
          throw new Error('Distance (meters) and time (mm:ss) are required for endurance entries');
        }
      }

      const payload = {
        userId: form.userId,
        exerciseId: form.exerciseId,
        loggedAt: new Date(form.loggedAt).toISOString(),
        sets: Number(form.sets),
        ...(selectedMetricType === 'endurance'
          ? {
              distanceKm: distanceMeters,
              durationSeconds,
            }
          : {
              reps: Number(form.reps),
              weight: Number(form.weight),
              ...(distanceMeters !== null ? { distanceKm: distanceMeters } : {}),
              ...(durationSeconds !== null ? { durationSeconds } : {}),
            }),
        notes: form.notes,
      };

      const response = await fetch(form.id ? `/api/leaderboard/entries/${form.id}` : '/api/leaderboard/entries', {
        method: form.id ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || 'Unable to save leaderboard entry');

      await refreshEntries();
      resetForm();
      setStatus(form.id ? 'Leaderboard entry updated.' : 'Leaderboard entry added.');
    } catch (err: any) {
      setError(err.message || 'Unable to save leaderboard entry');
    } finally {
      setSaving(false);
    }
  };

  const deleteEntry = async (entry: ManagedEntry) => {
    if (!confirm(`Delete ${entry.user.name}'s ${entry.exercise.name} leaderboard entry?`)) return;

    setStatus('');
    setError('');

    try {
      const response = await fetch(`/api/leaderboard/entries/${entry.id}`, { method: 'DELETE' });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || 'Unable to delete leaderboard entry');
      await refreshEntries();
      if (form.id === entry.id) resetForm();
      setStatus('Leaderboard entry deleted.');
    } catch (err: any) {
      setError(err.message || 'Unable to delete leaderboard entry');
    }
  };

  return (
    <section className="mb-8 rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.06] p-4">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-emerald-300/70">Admin</p>
          <h2 className="mt-1 text-xl font-extrabold tracking-tight text-white">Leaderboard Management</h2>
        </div>
        {form.id && (
          <button
            type="button"
            onClick={resetForm}
            className="rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-xs font-bold text-white/55 transition hover:bg-white/[0.08]"
          >
            New Entry
          </button>
        )}
      </div>

      <div className="grid gap-2 md:grid-cols-2">
        <select
          value={form.userId}
          onChange={(event) => setForm((current) => ({ ...current, userId: event.target.value }))}
          aria-label="Leaderboard user"
          className="min-w-0 rounded-xl border border-white/[0.08] bg-[#0A0A0F] px-3 py-2 text-sm text-white"
        >
          {users.map((user) => (
            <option key={user.id} value={user.id}>{user.name} · {user.email}</option>
          ))}
        </select>
        <select
          value={form.exerciseId}
          onChange={(event) => setForm((current) => ({ ...current, exerciseId: event.target.value }))}
          aria-label="Leaderboard exercise"
          className="min-w-0 rounded-xl border border-white/[0.08] bg-[#0A0A0F] px-3 py-2 text-sm text-white"
        >
          {exercises.map((exercise) => (
            <option key={exercise.id} value={exercise.id}>{exercise.name} · {exercise.muscleGroup}</option>
          ))}
        </select>
        <input
          type="datetime-local"
          value={form.loggedAt}
          onChange={(event) => setForm((current) => ({ ...current, loggedAt: event.target.value }))}
          aria-label="Logged at"
          className="min-w-0 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-white"
        />
        <input
          value={form.sets}
          onChange={(event) => setForm((current) => ({ ...current, sets: event.target.value }))}
          placeholder="Sets"
          inputMode="numeric"
          className="min-w-0 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-white placeholder:text-white/25"
        />
        {selectedMetricType === 'endurance' ? (
          <>
            <input
              type="number"
              value={form.distanceKm}
              onChange={(event) => setForm((current) => ({ ...current, distanceKm: event.target.value }))}
              placeholder="Distance (m)"
              inputMode="decimal"
              step="0.01"
              min="0.01"
              className="min-w-0 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-white placeholder:text-white/25"
            />
            <input
              value={form.duration}
              onChange={(event) => setForm((current) => ({ ...current, duration: event.target.value }))}
              placeholder="00:00"
              inputMode="numeric"
              maxLength={5}
              className="min-w-0 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-white placeholder:text-white/25"
            />
          </>
        ) : (
          <>
            <input
              value={form.weight}
              onChange={(event) => setForm((current) => ({ ...current, weight: event.target.value }))}
              placeholder="Weight kg"
              inputMode="decimal"
              className="min-w-0 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-white placeholder:text-white/25"
            />
            <input
              value={form.reps}
              onChange={(event) => setForm((current) => ({ ...current, reps: event.target.value }))}
              placeholder="Reps"
              inputMode="numeric"
              className="min-w-0 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-white placeholder:text-white/25"
            />
          </>
        )}
        <input
          value={form.notes}
          onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
          placeholder="Notes"
          className="min-w-0 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-white placeholder:text-white/25 md:col-span-2"
        />
      </div>

      <button
        type="button"
        onClick={saveEntry}
        disabled={saving || !form.userId || !form.exerciseId || !form.loggedAt}
        className="mt-3 w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-extrabold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-white/[0.06] disabled:text-white/25"
      >
        {saving ? 'Saving...' : form.id ? 'Update Entry' : 'Add Entry'}
      </button>

      {status && <p className="mt-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs font-bold text-emerald-200">{status}</p>}
      {error && <p className="mt-3 whitespace-pre-wrap rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs font-bold text-red-200">{error}</p>}

      <div className="mt-5">
        <input
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setPage(1);
          }}
          placeholder="Search entries"
          className="mb-3 w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-white placeholder:text-white/25"
        />

        <div className="max-h-96 space-y-2 overflow-y-auto pr-1">
          {visibleEntries.map((entry) => (
            <article key={entry.id} className="rounded-xl border border-white/[0.08] bg-[#0A0A0F]/80 p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-extrabold text-white">{entry.user.name}</p>
                  <p className="mt-0.5 truncate text-xs text-white/40">{entry.exercise.name} · {formatEntrySummary(entry)}</p>
                  <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-white/25">
                    {new Date(entry.loggedAt).toLocaleString()}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    onClick={() => editEntry(entry)}
                    className="rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-xs font-bold text-white/60 transition hover:bg-white/[0.08]"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteEntry(entry)}
                    className="rounded-lg border border-red-400/20 bg-red-500/10 px-3 py-2 text-xs font-bold text-red-300 transition hover:bg-red-500/15"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>

        <div className="mt-3 flex items-center justify-between gap-3">
          <p className="text-xs font-bold text-white/35">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={page === 1}
              className="rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-xs font-bold text-white/55 transition hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-30"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              disabled={page === totalPages}
              className="rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-xs font-bold text-white/55 transition hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-30"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
