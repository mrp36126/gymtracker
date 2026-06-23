'use client';

import { useState, useEffect } from 'react';
import type { Exercise, ExerciseCatalogItem } from '@/types';
import { useRouter } from 'next/navigation';
import ExerciseCard from './ExerciseCard';

interface Props {
  day: string;
  programId: string;
  program: { name: string };
  targetUserId: string;
  targetUserName: string;
  user: { id: string };
  initialExercises: Exercise[];
  readOnly: boolean;
  isTrainingForSomeone: boolean;
}

export default function WorkoutSessionManager({
  day,
  programId,
  program,
  targetUserId,
  targetUserName,
  user,
  initialExercises,
  readOnly,
  isTrainingForSomeone,
}: Props) {
  const router = useRouter();
  const [exercises, setExercises] = useState(initialExercises);
  const [showAddExercise, setShowAddExercise] = useState(false);
  const [addQuery, setAddQuery] = useState('');
  const [allExercises, setAllExercises] = useState<ExerciseCatalogItem[]>([]);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    const loadExercises = async () => {
      try {
        const response = await fetch('/api/exercises', { method: 'GET' });
        if (response.ok) {
          const data = await response.json();
          setAllExercises(data.exercises || []);
        }
      } catch (err) {
        console.error('Failed to load exercises:', err);
      }
    };

    if (showAddExercise) {
      loadExercises();
    }
  }, [showAddExercise]);

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

  const handleDeleteExercise = async (exerciseId: string) => {
    if (!confirm('Delete this exercise from the workout?')) return;

    setDeleting(exerciseId);
    try {
      const response = await fetch(`/api/programs/${programId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ removeExerciseId: exerciseId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete exercise');
      }

      setExercises(exercises.filter((ex) => ex.id !== exerciseId));
    } catch (err: any) {
      alert(`Error: ${err.message || 'Failed to delete exercise'}`);
    } finally {
      setDeleting(null);
    }
  };

  const handleAddExercise = async (exercise: ExerciseCatalogItem) => {
    setAdding(true);
    try {
      const response = await fetch(`/api/programs/${programId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          addExercise: {
            exerciseId: exercise.id,
            day,
            sets: 3,
            reps: '10',
            notes: '',
          },
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to add exercise');
      }

      const data = await response.json();
      if (data.data?.exercises) {
        const dayExercises = data.data.exercises.filter(
          (ex: Exercise) => ex.day === day
        );
        setExercises(dayExercises);
      }

      setShowAddExercise(false);
      setAddQuery('');
      router.refresh();
    } catch (err: any) {
      alert(`Error: ${err.message || 'Failed to add exercise'}`);
    } finally {
      setAdding(false);
    }
  };

  return (
    <>
      <div className="w-full max-w-lg mx-auto px-4 pt-5 overflow-hidden pb-8">
        {exercises.map((ex, i) => (
          <div key={ex.id}>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-5 h-5 rounded-full bg-indigo-600 flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0">
                {i + 1}
              </div>
              <div className="h-px flex-1 bg-white/[0.05]"></div>
            </div>
            <ExerciseCard
              exercise={ex}
              readOnly={readOnly}
              targetUserId={isTrainingForSomeone ? targetUserId : undefined}
              onDelete={() => handleDeleteExercise(ex.id)}
            />
          </div>
        ))}

        {!readOnly && (
          <button
            type="button"
            onClick={() => setShowAddExercise(true)}
            className="mt-6 w-full rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm font-extrabold text-emerald-400 transition hover:border-emerald-500/50 hover:bg-emerald-500/15"
          >
            + Add Exercise
          </button>
        )}
      </div>

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
                <p className="text-center text-white/40 py-8">
                  {allExercises.length === 0 ? 'Loading exercises...' : 'No exercises found'}
                </p>
              ) : (
                filteredExercises.map((exercise) => (
                  <button
                    key={exercise.id}
                    type="button"
                    onClick={() => handleAddExercise(exercise)}
                    disabled={adding}
                    className="w-full text-left rounded-xl border border-white/[0.08] bg-white/[0.04] p-3 transition hover:border-indigo-400/30 hover:bg-indigo-600/10 disabled:opacity-50"
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
    </>
  );
}
