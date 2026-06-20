'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { ExerciseCatalogItem } from '@/types';

interface Props {
  targetUserId: string;
  targetUserName: string;
  todayName: string;
  exercises: ExerciseCatalogItem[];
}

type SelectedExercise = {
  id: string;
  exerciseId: string;
  name: string;
  category: string;
  sets: string;
  reps: string;
  notes: string;
};

export default function TrainerSessionBuilder({ targetUserId, targetUserName, todayName, exercises }: Props) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<SelectedExercise[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const filteredExercises = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return exercises;

    return exercises.filter((exercise) => (
      [
        exercise.exerciseName,
        exercise.category,
        exercise.equipment,
        exercise.difficulty,
        exercise.description,
        ...exercise.primaryMuscles,
        ...exercise.secondaryMuscles,
      ].join(' ').toLowerCase().includes(normalized)
    ));
  }, [exercises, query]);

  const addExercise = (exercise: ExerciseCatalogItem) => {
    setSelected((current) => ([
      ...current,
      {
        id: `${exercise.id}-${Date.now()}-${current.length}`,
        exerciseId: exercise.id,
        name: exercise.exerciseName,
        category: exercise.category,
        sets: '3',
        reps: '10',
        notes: exercise.instructions,
      },
    ]));
  };

  const updateSelectedExercise = (id: string, field: 'sets' | 'reps' | 'notes', value: string) => {
    setSelected((current) => current.map((exercise) => (
      exercise.id === id ? { ...exercise, [field]: value } : exercise
    )));
  };

  const removeSelectedExercise = (id: string) => {
    setSelected((current) => current.filter((exercise) => exercise.id !== id));
  };

  const handleLoadSession = async () => {
    if (selected.length === 0) {
      setError('Add at least one exercise to load this training session.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/trainer/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetUserId,
          exercises: selected.map((exercise) => ({
            exerciseId: exercise.exerciseId,
            sets: Number(exercise.sets),
            reps: exercise.reps,
            notes: exercise.notes,
          })),
        }),
      });

      const json = await response.json();
      if (!response.ok) throw new Error(json.error || 'Unable to load training session');

      router.push(`/workout/${todayName.toLowerCase()}?userId=${targetUserId}`);
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Unable to load training session');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-indigo-500/20 bg-indigo-500/[0.06] p-5">
        <p className="text-xs font-semibold tracking-widest text-indigo-300/70 uppercase mb-2">Select Exercises To Load</p>
        <p className="text-xl font-extrabold tracking-tight text-white">{targetUserName} · {todayName}</p>
        <p className="mt-2 text-sm text-white/45">No pre-loaded program is used. Build this session exercise-by-exercise, then start logging sets and reps.</p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300 whitespace-pre-wrap">
          {error}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4">
          <p className="text-xs font-semibold tracking-widest text-white/30 uppercase mb-3">Exercise Pool</p>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search exercises"
            className="mb-3 w-full rounded-xl border border-white/[0.08] bg-white/[0.06] px-3 py-2 text-sm text-white outline-none transition focus:border-indigo-500/50"
          />

          <div className="max-h-[28rem] space-y-2 overflow-y-auto pr-1">
            {filteredExercises.map((exercise) => (
              <div key={exercise.id} className="rounded-xl border border-white/[0.06] bg-black/10 p-3">
                <p className="text-sm font-bold text-white">{exercise.exerciseName}</p>
                <p className="text-[10px] uppercase tracking-widest text-white/30 mt-0.5">{exercise.category}</p>
                <button
                  type="button"
                  onClick={() => addExercise(exercise)}
                  className="mt-3 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-indigo-500"
                >
                  Add to session
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4">
          <p className="text-xs font-semibold tracking-widest text-white/30 uppercase mb-3">Session Exercises ({selected.length})</p>

          {selected.length === 0 ? (
            <div className="rounded-xl border border-white/[0.06] bg-black/10 p-6 text-center text-sm text-white/40">
              Add exercises from the pool to build today&apos;s trainer-led session.
            </div>
          ) : (
            <div className="max-h-[28rem] space-y-3 overflow-y-auto pr-1">
              {selected.map((exercise, index) => (
                <div key={exercise.id} className="rounded-xl border border-white/[0.06] bg-black/10 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold text-white">{index + 1}. {exercise.name}</p>
                      <p className="text-[10px] uppercase tracking-widest text-white/30 mt-0.5">{exercise.category}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeSelectedExercise(exercise.id)}
                      className="rounded-lg bg-red-500/10 px-2.5 py-1.5 text-xs font-bold text-red-300 transition hover:bg-red-500/15"
                    >
                      Remove
                    </button>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <input
                      value={exercise.sets}
                      onChange={(event) => updateSelectedExercise(exercise.id, 'sets', event.target.value)}
                      placeholder="Sets"
                      inputMode="numeric"
                      className="rounded-lg border border-white/[0.08] bg-white/[0.06] px-3 py-2 text-sm text-white outline-none transition focus:border-indigo-500/50"
                    />
                    <input
                      value={exercise.reps}
                      onChange={(event) => updateSelectedExercise(exercise.id, 'reps', event.target.value)}
                      placeholder="Reps"
                      className="rounded-lg border border-white/[0.08] bg-white/[0.06] px-3 py-2 text-sm text-white outline-none transition focus:border-indigo-500/50"
                    />
                  </div>

                  <textarea
                    value={exercise.notes}
                    onChange={(event) => updateSelectedExercise(exercise.id, 'notes', event.target.value)}
                    rows={3}
                    placeholder="Notes (optional)"
                    className="mt-2 w-full rounded-lg border border-white/[0.08] bg-white/[0.06] px-3 py-2 text-sm text-white outline-none transition focus:border-indigo-500/50"
                  />
                </div>
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={handleLoadSession}
            disabled={loading || selected.length === 0}
            className="mt-4 w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-extrabold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/35"
          >
            {loading ? 'Loading session...' : `Load Exercises For ${targetUserName}`}
          </button>
        </div>
      </div>
    </div>
  );
}