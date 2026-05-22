'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { ExerciseCatalogItem } from '@/types';

type ProgramExercise = {
  id: string;
  name: string;
  muscleGroup: string;
  day: string;
  order: number;
  defaultSets: number;
  defaultReps: string;
  notes?: string | null;
};

interface Props {
  programId: string;
  initialExercises: ProgramExercise[];
  exerciseCatalog: ExerciseCatalogItem[];
}

const dayOptions = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
const defaultExerciseDay = dayOptions[0];

function groupByDay(exercises: ProgramExercise[]) {
  return exercises.reduce<Record<string, ProgramExercise[]>>((acc, exercise) => {
    if (!acc[exercise.day]) acc[exercise.day] = [];
    acc[exercise.day].push(exercise);
    return acc;
  }, {});
}

export default function ProgramExerciseManager({ programId, initialExercises, exerciseCatalog }: Props) {
  const router = useRouter();
  const [exercises, setExercises] = useState(initialExercises);
  const [query, setQuery] = useState('');
  const [exerciseId, setExerciseId] = useState(exerciseCatalog[0]?.id ?? '');
  const [day, setDay] = useState(defaultExerciseDay);
  const [sets, setSets] = useState('3');
  const [reps, setReps] = useState('10');
  const [saving, setSaving] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const filteredCatalog = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return exerciseCatalog;

    return exerciseCatalog.filter((exercise) => [
      exercise.exerciseName,
      exercise.category,
      exercise.equipment,
      exercise.difficulty,
      exercise.description,
      ...exercise.primaryMuscles,
      ...exercise.secondaryMuscles,
    ].join(' ').toLowerCase().includes(normalized));
  }, [exerciseCatalog, query]);

  const byDay = groupByDay(exercises);

  const showSuccess = (message: string) => {
    setSuccess(message);
    setTimeout(() => setSuccess(''), 3000);
  };

  const handleAddExercise = async () => {
    if (!exerciseId) {
      setError('Choose an exercise to add');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/programs/' + programId, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          addExercise: {
            exerciseId,
            day,
            sets,
            reps,
          },
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to add exercise');

      setExercises((prev) => [...prev, json.data.exercise].sort((a, b) =>
        dayOptions.indexOf(a.day) - dayOptions.indexOf(b.day) || a.order - b.order
      ));
      showSuccess('Exercise added to ' + day + '.');
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveExercise = async (exercise: ProgramExercise) => {
    if (!confirm('Remove "' + exercise.name + '" from ' + exercise.day + '?')) return;

    setRemovingId(exercise.id);
    setError('');
    try {
      const res = await fetch('/api/programs/' + programId, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ removeExerciseId: exercise.id }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to remove exercise');

      setExercises((prev) => prev.filter((item) => item.id !== exercise.id));
      showSuccess('Exercise removed.');
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <div className="mb-6 rounded-2xl border border-white/[0.06] bg-white/[0.04] overflow-hidden">
      <div className="border-b border-indigo-500/20 bg-indigo-600/20 px-5 py-3">
        <h2 className="text-sm font-bold text-white">Amend Program Exercises</h2>
      </div>

      <div className="space-y-4 p-5">
        {error && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300">
            {error}
          </div>
        )}
        {success && (
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-300">
            {success}
          </div>
        )}

        <div className="space-y-3">
          <input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              const firstMatch = exerciseCatalog.find((exercise) => [
                exercise.exerciseName,
                exercise.category,
                exercise.equipment,
                exercise.difficulty,
                exercise.description,
                ...exercise.primaryMuscles,
                ...exercise.secondaryMuscles,
              ].join(' ').toLowerCase().includes(event.target.value.trim().toLowerCase()));
              setExerciseId(firstMatch?.id ?? '');
            }}
            placeholder="Search exercise catalog"
            className="w-full rounded-xl border border-white/[0.08] bg-white/[0.06] px-4 py-2.5 text-sm text-white placeholder:text-white/20 transition focus:outline-none focus:border-indigo-500/50"
          />

          <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto]">
            <select
              value={exerciseId}
              onChange={(event) => setExerciseId(event.target.value)}
              className="min-w-0 rounded-lg border border-white/[0.08] bg-white/[0.06] px-3 py-2 text-sm text-white transition focus:outline-none focus:border-indigo-500/50"
            >
              {filteredCatalog.length === 0 ? (
                <option value="" className="bg-gray-900 text-white">
                  No exercises found
                </option>
              ) : (
                filteredCatalog.map((exercise) => (
                  <option key={exercise.id} value={exercise.id} className="bg-gray-900 text-white">
                    {exercise.exerciseName}
                  </option>
                ))
              )}
            </select>

            <select
              value={day}
              onChange={(event) => setDay(event.target.value)}
              className="rounded-lg border border-white/[0.08] bg-white/[0.06] px-3 py-2 text-sm text-white transition focus:outline-none focus:border-indigo-500/50"
            >
              {dayOptions.map((option) => (
                <option key={option} value={option} className="bg-gray-900 text-white">
                  {option}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={handleAddExercise}
              disabled={saving || !exerciseId}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-indigo-500 disabled:opacity-50"
            >
              {saving ? 'Adding...' : 'Add Exercise'}
            </button>
          </div>

          <div className="grid gap-2 sm:grid-cols-[90px_1fr]">
            <input
              value={sets}
              onChange={(event) => setSets(event.target.value)}
              placeholder="Sets"
              inputMode="numeric"
              className="rounded-lg border border-white/[0.08] bg-white/[0.06] px-3 py-2 text-sm text-white placeholder:text-white/20 transition focus:outline-none focus:border-indigo-500/50"
            />
            <input
              value={reps}
              onChange={(event) => setReps(event.target.value)}
              placeholder="Reps e.g. 10 or 8-12"
              className="rounded-lg border border-white/[0.08] bg-white/[0.06] px-3 py-2 text-sm text-white placeholder:text-white/20 transition focus:outline-none focus:border-indigo-500/50"
            />
          </div>
        </div>

        <div className="space-y-4 border-t border-white/[0.05] pt-4">
          {dayOptions.filter((option) => byDay[option]?.length).map((option) => (
            <div key={option}>
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-white/30">{option}</p>
              <div className="space-y-2">
                {byDay[option].map((exercise) => (
                  <div key={exercise.id} className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.06] bg-black/10 px-3 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-white">{exercise.name}</p>
                      <p className="text-[10px] uppercase tracking-widest text-white/30">
                        {exercise.muscleGroup} · {exercise.defaultSets} sets x {exercise.defaultReps} reps
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveExercise(exercise)}
                      disabled={removingId === exercise.id}
                      className="rounded-lg bg-red-500/10 px-3 py-1.5 text-xs font-bold text-red-300 transition hover:bg-red-500/15 disabled:opacity-50"
                    >
                      {removingId === exercise.id ? 'Removing...' : 'Remove'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
