'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { ExerciseCatalogItem } from '@/types';
import WorkoutTimerButton from '@/components/timer/WorkoutTimerButton';
import { useWorkoutTimer } from '@/components/timer/WorkoutTimerProvider';
import { CUSTOM_WORKOUT_STORAGE_KEY } from './CustomWorkoutBuilder';

type SelectedExercise = {
  instanceId: string;
  exercise: ExerciseCatalogItem;
  sets: string;
  reps: string;
  notes: string;
};

type StoredCustomWorkout = {
  startedAt: string;
  exercises: SelectedExercise[];
  allExercises?: ExerciseCatalogItem[];
};

function muscleLabel(muscles: string[]) {
  return muscles.length > 0 ? muscles.join(', ') : 'Not specified';
}

function ExerciseImage({ src, alt }: { src: string; alt: string }) {
  const [failed, setFailed] = useState(!src);

  if (failed) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-[#12121A]">
        <svg width="28" height="28" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="2" viewBox="0 0 24 24">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <path d="m21 15-5-5L5 21" />
        </svg>
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} className="h-full w-full object-contain" onError={() => setFailed(true)} />
  );
}

export default function CustomWorkoutSession() {
  const [workout, setWorkout] = useState<StoredCustomWorkout | null>(null);
  const [completed, setCompleted] = useState<Record<string, boolean>>({});
  const [showAddExercise, setShowAddExercise] = useState(false);
  const [addQuery, setAddQuery] = useState('');
  const [allExercises, setAllExercises] = useState<ExerciseCatalogItem[]>([]);
  const { startExercise, stopExercise, activeExerciseId } = useWorkoutTimer();

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(CUSTOM_WORKOUT_STORAGE_KEY);
      setWorkout(stored ? JSON.parse(stored) : null);
    } catch {
      setWorkout(null);
    }
  }, []);

  useEffect(() => {
    if (workout?.allExercises) {
      setAllExercises(workout.allExercises);
    }
  }, [workout?.allExercises]);

  const toggleComplete = (instanceId: string) => {
    setCompleted((current) => ({ ...current, [instanceId]: !current[instanceId] }));
  };

  const deleteExercise = (instanceId: string) => {
    if (!workout) return;
    const updated = {
      ...workout,
      exercises: workout.exercises.filter((ex) => ex.instanceId !== instanceId),
    };
    setWorkout(updated);
    window.localStorage.setItem(CUSTOM_WORKOUT_STORAGE_KEY, JSON.stringify(updated));
  };

  const addExercise = (exercise: ExerciseCatalogItem) => {
    if (!workout) return;
    const updated = {
      ...workout,
      exercises: [
        ...workout.exercises,
        {
          instanceId: `${exercise.id}-${Date.now()}-${workout.exercises.length}`,
          exercise,
          sets: '',
          reps: '',
          notes: '',
        },
      ],
    };
    setWorkout(updated);
    window.localStorage.setItem(CUSTOM_WORKOUT_STORAGE_KEY, JSON.stringify(updated));
    setShowAddExercise(false);
    setAddQuery('');
  };

  const filteredExercises = allExercises.filter((exercise) => {
    const normalized = addQuery.trim().toLowerCase();
    if (!normalized) return true;
    return [
      exercise.exerciseName,
      exercise.category,
      exercise.equipment,
      exercise.difficulty,
      exercise.description,
      ...exercise.primaryMuscles,
      ...exercise.secondaryMuscles,
    ].join(' ').toLowerCase().includes(normalized);
  });

  if (!workout) {
    return (
      <div className="mx-auto max-w-lg px-4 pt-8">
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-8 text-center">
          <p className="text-lg font-extrabold text-white">No custom workout selected</p>
          <p className="mt-2 text-sm leading-6 text-white/45">
            Build a custom workout first, then tap Begin to start the session.
          </p>
          <Link
            href="/custom-workout"
            className="mt-5 inline-flex rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-indigo-500"
          >
            Build Workout
          </Link>
        </div>
      </div>
    );
  }

  const completedCount = workout.exercises.filter((item) => completed[item.instanceId]).length;

  return (
    <>
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/[0.06] bg-white/[0.03] px-6 py-4 backdrop-blur-xl">
        <Link href="/custom-workout" className="text-sm text-white/40 transition hover:text-white/70">&lt;- Builder</Link>
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-white/30">Custom Session</p>
          <p className="text-sm font-bold text-white">Today&apos;s Workout</p>
        </div>
        <WorkoutTimerButton label="Custom Workout" />
      </div>

      <div className="mx-auto w-full max-w-lg px-4 pt-5">
        <div className="mb-5 rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.06] p-5">
          <p className="text-xs font-bold uppercase tracking-widest text-emerald-300/70">In Progress</p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-white">Custom Workout</h1>
          <p className="mt-1 text-sm text-white/45">
            {completedCount} of {workout.exercises.length} exercises marked done
          </p>
        </div>

        {workout.exercises.map((item, index) => {
          const isActive = activeExerciseId === item.instanceId;
          const isDone = Boolean(completed[item.instanceId]);

          return (
            <div key={item.instanceId}>
              <div className="mb-3 flex items-center gap-2">
                <div className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white ${isDone ? 'bg-emerald-500' : 'bg-indigo-600'}`}>
                  {index + 1}
                </div>
                <div className="h-px flex-1 bg-white/[0.05]"></div>
              </div>

              <article className="mb-4 overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.04]">
                <div className="relative aspect-[16/9] bg-[#12121A]">
                  <ExerciseImage src={item.exercise.imageUrl} alt={item.exercise.exerciseName} />
                  <span className="absolute right-3 top-3 rounded-full bg-indigo-600 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
                    {item.exercise.category}
                  </span>
                </div>

                <div className="p-4">
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <h2 className="text-base font-extrabold tracking-tight text-white">{item.exercise.exerciseName}</h2>
                      <p className="mt-1 text-xs leading-5 text-white/40">{muscleLabel(item.exercise.primaryMuscles)}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => isActive ? stopExercise() : startExercise(item.instanceId, item.exercise.exerciseName)}
                      className={`shrink-0 rounded-full border px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wide transition active:scale-95 ${
                        isActive
                          ? 'border-emerald-400/30 bg-emerald-500/15 text-emerald-300'
                          : 'border-white/10 bg-white/[0.04] text-white/40 hover:border-indigo-400/30 hover:text-white/70'
                      }`}
                    >
                      {isActive ? 'Stop' : 'Time'}
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-xl bg-white/[0.04] px-3 py-2">
                      <p className="text-[9px] font-bold uppercase tracking-widest text-white/25">Sets</p>
                      <p className="mt-1 text-white/70">{item.sets || '-'}</p>
                    </div>
                    <div className="rounded-xl bg-white/[0.04] px-3 py-2">
                      <p className="text-[9px] font-bold uppercase tracking-widest text-white/25">Reps</p>
                      <p className="mt-1 text-white/70">{item.reps || '-'}</p>
                    </div>
                  </div>

                  {item.notes && (
                    <p className="mt-3 rounded-xl bg-white/[0.04] px-3 py-2 text-xs leading-5 text-white/50">{item.notes}</p>
                  )}

                  <details className="mt-3 rounded-xl border border-white/[0.06] bg-black/10 px-3 py-2">
                    <summary className="cursor-pointer text-xs font-bold text-white/60">Instructions</summary>
                    <p className="mt-2 text-xs leading-5 text-white/45">{item.exercise.instructions}</p>
                    <div className="mt-3 aspect-[16/9] overflow-hidden rounded-xl border border-white/[0.06] bg-[#12121A]">
                      <ExerciseImage src={item.exercise.detailImageUrl} alt={`${item.exercise.exerciseName} details`} />
                    </div>
                  </details>

                  <div className="mt-4 flex gap-2">
                    <button
                      type="button"
                      onClick={() => toggleComplete(item.instanceId)}
                      className={`flex-1 rounded-xl px-4 py-3 text-sm font-extrabold transition active:scale-[0.99] ${
                        isDone
                          ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-400/25'
                          : 'bg-indigo-600 text-white hover:bg-indigo-500'
                      }`}
                    >
                      {isDone ? 'Completed' : 'Mark Complete'}
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteExercise(item.instanceId)}
                      className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-extrabold text-red-400 transition hover:border-red-500/50 hover:bg-red-500/15"
                      aria-label="Delete exercise"
                    >
                      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" className="mx-auto">
                        <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h16zM10 11v6M14 11v6" />
                      </svg>
                    </button>
                  </div>
                </div>
              </article>
            </div>
          );
        })}

        {showAddExercise && (
          <div className="fixed inset-0 z-50 flex items-end bg-black/50 backdrop-blur-sm">
            <div className="w-full rounded-t-3xl border-t border-white/[0.08] bg-[#0A0A0F] p-4 max-h-[80vh] flex flex-col">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-extrabold text-white">Add Exercise</h2>
                <button
                  type="button"
                  onClick={() => setShowAddExercise(false)}
                  className="text-white/40 hover:text-white/70 transition"
                  aria-label="Close add exercise modal"
                >
                  <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <input
                value={addQuery}
                onChange={(e) => setAddQuery(e.target.value)}
                placeholder="Search exercises..."
                className="mb-4 rounded-xl border border-white/[0.08] bg-white/[0.06] px-4 py-3 text-sm text-white placeholder:text-white/30 outline-none transition focus:border-indigo-400/50"
              />

              <div className="flex-1 overflow-y-auto space-y-2 pr-2">
                {filteredExercises.length === 0 ? (
                  <p className="text-center text-white/40 py-8">No exercises found</p>
                ) : (
                  filteredExercises.map((exercise) => (
                    <button
                      key={exercise.id}
                      type="button"
                      onClick={() => addExercise(exercise)}
                      className="w-full text-left rounded-xl border border-white/[0.08] bg-white/[0.04] p-3 transition hover:border-indigo-400/30 hover:bg-indigo-600/10"
                    >
                      <p className="font-bold text-white text-sm">{exercise.exerciseName}</p>
                      <p className="text-xs text-white/40 mt-1">{exercise.category}</p>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={() => setShowAddExercise(true)}
          className="mt-6 w-full rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm font-extrabold text-emerald-400 transition hover:border-emerald-500/50 hover:bg-emerald-500/15"
        >
          + Add Exercise
        </button>
      </div>
    </>
  );
}
