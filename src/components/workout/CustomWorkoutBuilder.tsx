'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { ExerciseCatalogItem } from '@/types';
import { useWorkoutTimer } from '@/components/timer/WorkoutTimerProvider';

type SelectedExercise = {
  instanceId: string;
  exercise: ExerciseCatalogItem;
  sets: string;
  reps: string;
  notes: string;
};

type Props = {
  exercises: ExerciseCatalogItem[];
};

export const CUSTOM_WORKOUT_STORAGE_KEY = 'gymtracker-custom-workout-today';

function muscleLabel(muscles: string[]) {
  return muscles.length > 0 ? muscles.join(', ') : 'Not specified';
}

function ExerciseImage({
  src,
  alt,
  className,
}: {
  src: string;
  alt: string;
  className: string;
}) {
  const [failed, setFailed] = useState(!src);

  if (failed) {
    return (
      <div className={`${className} flex items-center justify-center bg-[#12121A]`}>
        <svg width="24" height="24" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="2" viewBox="0 0 24 24">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <path d="m21 15-5-5L5 21" />
        </svg>
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className={className}
      onError={() => setFailed(true)}
    />
  );
}

export default function CustomWorkoutBuilder({ exercises }: Props) {
  const router = useRouter();
  const { startWorkout } = useWorkoutTimer();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const [selected, setSelected] = useState<SelectedExercise[]>([]);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState('');

  const categories = useMemo(() => {
    return ['All', ...Array.from(new Set(exercises.map((exercise) => exercise.category))).sort()];
  }, [exercises]);

  const filteredExercises = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return exercises.filter((exercise) => {
      const matchesCategory = category === 'All' || exercise.category === category;
      if (!matchesCategory) return false;

      if (!normalizedQuery) return true;

      const searchable = [
        exercise.exerciseName,
        exercise.category,
        exercise.equipment,
        exercise.difficulty,
        exercise.description,
        ...exercise.primaryMuscles,
        ...exercise.secondaryMuscles,
      ].join(' ').toLowerCase();

      return searchable.includes(normalizedQuery);
    });
  }, [category, exercises, query]);

  const addExercise = (exercise: ExerciseCatalogItem) => {
    setSelected((current) => [
      ...current,
      {
        instanceId: `${exercise.id}-${Date.now()}-${current.length}`,
        exercise,
        sets: '',
        reps: '',
        notes: '',
      },
    ]);
  };

  const removeExercise = (instanceId: string) => {
    setSelected((current) => current.filter((item) => item.instanceId !== instanceId));
  };

  const moveExercise = (instanceId: string, direction: -1 | 1) => {
    setSelected((current) => {
      const index = current.findIndex((item) => item.instanceId === instanceId);
      const nextIndex = index + direction;

      if (index < 0 || nextIndex < 0 || nextIndex >= current.length) return current;

      const next = [...current];
      const [item] = next.splice(index, 1);
      if (!item) return current;
      next.splice(nextIndex, 0, item);
      return next;
    });
  };

  const updateSelected = (instanceId: string, field: 'sets' | 'reps' | 'notes', value: string) => {
    setSelected((current) =>
      current.map((item) => (
        item.instanceId === instanceId ? { ...item, [field]: value } : item
      ))
    );
  };

  const beginWorkout = async () => {
    if (selected.length === 0) return;

    setStarting(true);
    setStartError('');

    try {
      window.localStorage.setItem(CUSTOM_WORKOUT_STORAGE_KEY, JSON.stringify({
        startedAt: new Date().toISOString(),
        exercises: selected,
        allExercises: exercises,
      }));

      const response = await fetch('/api/custom-workout/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          exercises: selected.map((item) => ({
            exerciseId: item.exercise.id,
            sets: item.sets ? Number(item.sets) : undefined,
            reps: item.reps || undefined,
            notes: item.notes || undefined,
          })),
        }),
      });

      const json = await response.json();
      if (!response.ok) {
        throw new Error(json.error || 'Unable to start custom workout');
      }

      startWorkout('Custom Workout');
      router.push(`/workout/${String(json.data.day).toLowerCase()}`);
      router.refresh();
    } catch (err: any) {
      setStartError(err.message || 'Unable to start custom workout');
    } finally {
      setStarting(false);
    }
  };

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_390px]">
      <section className="min-w-0">
        <div className="mb-4 space-y-3">
          <div className="relative">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by exercise, muscle, category, or equipment"
              className="w-full rounded-2xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 pl-11 text-sm text-white placeholder:text-white/30 outline-none transition focus:border-indigo-400/50 focus:bg-white/[0.06]"
            />
            <svg className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1">
            {categories.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setCategory(item)}
                className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-bold transition ${
                  category === item
                    ? 'border-indigo-500 bg-indigo-600 text-white'
                    : 'border-white/[0.08] bg-white/[0.04] text-white/45 hover:border-white/15 hover:text-white/70'
                }`}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        {filteredExercises.length === 0 ? (
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-8 text-center">
            <p className="text-sm font-bold text-white">No exercises found</p>
            <p className="mt-1 text-sm text-white/40">Try a different search or category.</p>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {filteredExercises.map((exercise) => (
              <article key={exercise.id} className="overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.04]">
                <div className="relative aspect-[16/9] bg-[#12121A]">
                  <ExerciseImage
                    src={exercise.imageUrl}
                    alt={exercise.exerciseName}
                    className="h-full w-full object-contain"
                  />
                  <span className="absolute left-3 top-3 rounded-full bg-black/50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white/80 backdrop-blur">
                    {exercise.category}
                  </span>
                </div>

                <div className="p-4">
                  <div className="mb-3">
                    <h2 className="text-base font-extrabold tracking-tight text-white">{exercise.exerciseName}</h2>
                    <p className="mt-1 text-xs leading-5 text-white/45">{exercise.description}</p>
                  </div>

                  <div className="mb-3 grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-xl bg-white/[0.04] px-3 py-2">
                      <p className="font-bold uppercase tracking-widest text-white/25 text-[9px]">Muscles</p>
                      <p className="mt-1 text-white/65">{muscleLabel(exercise.primaryMuscles)}</p>
                    </div>
                    <div className="rounded-xl bg-white/[0.04] px-3 py-2">
                      <p className="font-bold uppercase tracking-widest text-white/25 text-[9px]">Equipment</p>
                      <p className="mt-1 text-white/65">{exercise.equipment}</p>
                    </div>
                  </div>

                  <details className="mb-4 rounded-xl border border-white/[0.06] bg-black/10 px-3 py-2">
                    <summary className="cursor-pointer text-xs font-bold text-white/60">Instructions and detail image</summary>
                    <p className="mt-2 text-xs leading-5 text-white/45">{exercise.instructions}</p>
                    <div className="mt-3 aspect-[16/9] overflow-hidden rounded-xl border border-white/[0.06] bg-[#12121A]">
                      <ExerciseImage
                        src={exercise.detailImageUrl}
                        alt={`${exercise.exerciseName} details`}
                        className="h-full w-full object-contain"
                      />
                    </div>
                  </details>

                  <div className="flex items-center justify-between gap-3">
                    <span className="rounded-full bg-white/[0.06] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white/40">
                      {exercise.difficulty}
                    </span>
                    <button
                      type="button"
                      onClick={() => addExercise(exercise)}
                      className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-indigo-500 active:scale-95"
                    >
                      Add exercise
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <aside className="lg:sticky lg:top-20 lg:self-start">
        <div className="rounded-2xl border border-indigo-500/20 bg-indigo-500/[0.06] p-4">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-indigo-300/70">Today's Custom Workout</p>
              <h2 className="mt-1 text-xl font-extrabold tracking-tight text-white">
                {selected.length} exercise{selected.length === 1 ? '' : 's'}
              </h2>
            </div>
            {selected.length > 0 && (
              <button
                type="button"
                onClick={() => setSelected([])}
                className="rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-xs font-bold text-white/45 transition hover:bg-white/[0.08] hover:text-white/70"
              >
                Clear
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={beginWorkout}
            disabled={selected.length === 0 || starting}
            className="mb-4 w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-extrabold text-white transition hover:bg-emerald-500 active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-white/[0.06] disabled:text-white/25"
          >
            {starting ? 'Starting...' : 'Begin'}
          </button>

          {startError && (
            <div className="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-200 whitespace-pre-wrap">
              {startError}
            </div>
          )}

          {selected.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/[0.12] bg-black/10 p-6 text-center">
              <p className="text-sm leading-6 text-white/45">
                No exercises selected yet. Choose exercises from the list to build today's workout.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {selected.map((item, index) => (
                <div key={item.instanceId} className="rounded-2xl border border-white/[0.08] bg-[#0A0A0F]/80 p-3">
                  <div className="flex gap-3">
                    <div className="relative h-16 w-20 shrink-0 overflow-hidden rounded-xl bg-[#12121A]">
                      <ExerciseImage
                        src={item.exercise.imageUrl}
                        alt={item.exercise.exerciseName}
                        className="h-full w-full object-contain"
                      />
                      <span className="absolute left-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-bold text-white">
                        {index + 1}
                      </span>
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-extrabold text-white">{item.exercise.exerciseName}</p>
                      <p className="mt-0.5 line-clamp-2 text-xs leading-5 text-white/40">
                        {muscleLabel(item.exercise.primaryMuscles)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <input
                      value={item.sets}
                      onChange={(event) => updateSelected(item.instanceId, 'sets', event.target.value)}
                      placeholder="Sets"
                      inputMode="numeric"
                      className="min-w-0 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-white placeholder:text-white/25 outline-none focus:border-indigo-400/50"
                    />
                    <input
                      value={item.reps}
                      onChange={(event) => updateSelected(item.instanceId, 'reps', event.target.value)}
                      placeholder="Reps"
                      className="min-w-0 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-white placeholder:text-white/25 outline-none focus:border-indigo-400/50"
                    />
                  </div>

                  <input
                    value={item.notes}
                    onChange={(event) => updateSelected(item.instanceId, 'notes', event.target.value)}
                    placeholder="Notes"
                    className="mt-2 w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-white placeholder:text-white/25 outline-none focus:border-indigo-400/50"
                  />

                  <div className="mt-3 flex items-center justify-between gap-2">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => moveExercise(item.instanceId, -1)}
                        disabled={index === 0}
                        className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.04] text-white/50 transition hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-30"
                        aria-label={`Move ${item.exercise.exerciseName} up`}
                      >
                        <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                          <path d="m18 15-6-6-6 6" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => moveExercise(item.instanceId, 1)}
                        disabled={index === selected.length - 1}
                        className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.04] text-white/50 transition hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-30"
                        aria-label={`Move ${item.exercise.exerciseName} down`}
                      >
                        <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                          <path d="m6 9 6 6 6-6" />
                        </svg>
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeExercise(item.instanceId)}
                      className="rounded-xl border border-red-400/20 bg-red-500/10 px-3 py-2 text-xs font-bold text-red-300 transition hover:bg-red-500/15"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
