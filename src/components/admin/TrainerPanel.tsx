'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { ExerciseCatalogItem } from '@/types';

interface TrainerUser {
  id: string;
  name: string;
  email: string;
  trainerId?: string | null;
}

interface Program {
  id: string;
  name: string;
  isActive: boolean;
  createdAt: Date;
  description?: string | null;
  programType: string;
  _count: { exercises: number };
  userId: string;
}

interface Props {
  trainerId: string;
  programs: Program[];
  assignedUsers: TrainerUser[];
  availableUsers: TrainerUser[];
  assignedPrograms: Array<Program & { user: TrainerUser }>;
  exerciseCatalog: ExerciseCatalogItem[];
}

type SelectedProgramExercise = {
  instanceId: string;
  exerciseId: string;
  day: string;
  sets: string;
  reps: string;
  notes: string;
};

const dayOptions = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const defaultExerciseDay = dayOptions[0];

function muscleLabel(muscles: string[]) {
  return muscles.length > 0 ? muscles.join(', ') : 'Not specified';
}

export default function TrainerPanel({ trainerId, programs, assignedUsers, availableUsers, assignedPrograms, exerciseCatalog }: Props) {
  const router = useRouter();
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [newName, setNewName] = useState('');
  const [description, setDescription] = useState('');
  const [programType, setProgramType] = useState<'primary' | 'supplementary'>('primary');
  const [catalogQuery, setCatalogQuery] = useState('');
  const [catalogDays, setCatalogDays] = useState<Record<string, string>>({});
  const [programExercises, setProgramExercises] = useState<SelectedProgramExercise[]>([]);
  const [creatingFromPool, setCreatingFromPool] = useState(false);

  const showSuccess = (message: string) => {
    setSuccess(message);
    setTimeout(() => setSuccess(''), 3000);
  };

  const filteredCatalog = useMemo(() => {
    const query = catalogQuery.trim().toLowerCase();
    if (!query) return exerciseCatalog;

    return exerciseCatalog.filter((exercise) => [
      exercise.exerciseName,
      exercise.category,
      exercise.equipment,
      exercise.difficulty,
      exercise.description,
      ...exercise.primaryMuscles,
      ...exercise.secondaryMuscles,
    ].join(' ').toLowerCase().includes(query));
  }, [catalogQuery, exerciseCatalog]);

  const addCatalogExercise = (exercise: ExerciseCatalogItem) => {
    const day = catalogDays[exercise.id] ?? defaultExerciseDay;
    setProgramExercises((prev) => [
      ...prev,
      {
        instanceId: `${exercise.id}-${Date.now()}-${prev.length}`,
        exerciseId: exercise.id,
        day,
        sets: '3',
        reps: '10',
        notes: exercise.instructions,
      },
    ]);
  };

  const updateProgramExercise = (
    instanceId: string,
    field: 'day' | 'sets' | 'reps' | 'notes',
    value: string,
  ) => {
    setProgramExercises((prev) => prev.map((item) => (
      item.instanceId === instanceId ? { ...item, [field]: value } : item
    )));
  };

  const removeProgramExercise = (instanceId: string) => {
    setProgramExercises((prev) => prev.filter((item) => item.instanceId !== instanceId));
  };

  const handleCreateFromPool = async () => {
    if (!newName.trim()) {
      setError('Please enter a program name');
      return;
    }
    if (programExercises.length === 0) {
      setError('Please add at least one exercise from the pool');
      return;
    }

    setCreatingFromPool(true);
    setError('');

    const orderByDay: Record<string, number> = {};
    const exercises = programExercises.map((item) => {
      orderByDay[item.day] = (orderByDay[item.day] ?? 0) + 1;
      return {
        exerciseId: item.exerciseId,
        day: item.day,
        order: orderByDay[item.day],
        sets: item.sets,
        reps: item.reps,
        notes: item.notes,
      };
    });

    try {
      const res = await fetch('/api/programs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName.trim(),
          description: description.trim(),
          programType,
          exercises,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);

      showSuccess(`Program "${newName}" created.`);
      setNewName('');
      setDescription('');
      setProgramType('primary');
      setCatalogDays({});
      setProgramExercises([]);
      router.refresh();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setCreatingFromPool(false);
    }
  };

  const handleAssignUser = async (targetUserId: string) => {
    setUpdatingUserId(targetUserId);
    setError('');
    try {
      const res = await fetch(`/api/trainer/users/${targetUserId}`, { method: 'PATCH' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      showSuccess(`${json.data.name} assigned to you.`);
      router.refresh();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setUpdatingUserId(null);
    }
  };

  const handleRemoveUser = async (targetUserId: string) => {
    setUpdatingUserId(targetUserId);
    setError('');
    try {
      const res = await fetch(`/api/trainer/users/${targetUserId}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      showSuccess('Trainer user removed from your list.');
      router.refresh();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setUpdatingUserId(null);
    }
  };

  const groupedAssignedPrograms = assignedPrograms.reduce<Record<string, typeof assignedPrograms>>((acc, program) => {
    if (!acc[program.user.id]) acc[program.user.id] = [];
    acc[program.user.id].push(program);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300 whitespace-pre-wrap">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-300">
          {success}
        </div>
      )}

      <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/[0.06] p-5">
        <p className="text-xs font-semibold tracking-widest text-cyan-300/70 uppercase mb-2">Assigned Users</p>
        <p className="text-lg font-bold text-white mb-4">{assignedUsers.length} trainer user{assignedUsers.length === 1 ? '' : 's'} assigned</p>

        <div className="space-y-3">
          {assignedUsers.map((assignedUser) => (
            <div key={assignedUser.id} className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-bold text-white">{assignedUser.name}</p>
                  <p className="text-xs text-white/40">{assignedUser.email}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link href={`/progress?userId=${assignedUser.id}`} className="rounded-lg bg-indigo-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-indigo-500">
                    View progress
                  </Link>
                  <button
                    type="button"
                    onClick={() => handleRemoveUser(assignedUser.id)}
                    disabled={updatingUserId === assignedUser.id}
                    className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs font-bold text-red-300 transition hover:bg-red-500/15 disabled:opacity-50"
                  >
                    {updatingUserId === assignedUser.id ? 'Updating...' : 'Remove'}
                  </button>
                </div>
              </div>

              {groupedAssignedPrograms[assignedUser.id]?.length ? (
                <div className="mt-4 space-y-2">
                  {groupedAssignedPrograms[assignedUser.id].map((program) => (
                    <Link key={program.id} href={`/program/${program.id}`} className="block rounded-xl border border-white/[0.06] bg-black/10 px-4 py-3 transition hover:border-indigo-500/30 hover:bg-white/[0.05]">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-white">{program.name}</p>
                          <p className="text-[10px] uppercase tracking-widest text-white/30">
                            {program.programType} · {program._count.exercises} exercises
                          </p>
                        </div>
                        {program.isActive && (
                          <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                            Active
                          </span>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-xs text-white/35">No programs assigned yet.</p>
              )}
            </div>
          ))}
        </div>

        {availableUsers.length > 0 && (
          <div className="mt-5 rounded-2xl border border-amber-500/20 bg-amber-500/[0.06] p-4">
            <p className="text-xs font-semibold tracking-widest text-amber-300/70 uppercase mb-3">Assign New User</p>
            <div className="space-y-2">
              {availableUsers.map((availableUser) => (
                <div key={availableUser.id} className="flex flex-col gap-3 rounded-xl border border-white/[0.06] bg-black/10 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-white">{availableUser.name}</p>
                    <p className="text-xs text-white/40">{availableUser.email}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleAssignUser(availableUser.id)}
                    disabled={updatingUserId === availableUser.id}
                    className="rounded-lg bg-amber-500 px-3 py-2 text-xs font-bold text-black transition hover:bg-amber-400 disabled:opacity-50"
                  >
                    {updatingUserId === availableUser.id ? 'Assigning...' : 'Assign to me'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-indigo-500/20 bg-indigo-500/[0.06] p-5">
        <p className="text-xs font-semibold tracking-widest text-indigo-300/70 uppercase mb-2">Create Program From Exercise Pool</p>
        <p className="text-lg font-bold text-white mb-4">Build a trainer program</p>

        <div className="space-y-3">
          <input value={newName} onChange={(event) => setNewName(event.target.value)} placeholder="Program name" className="w-full rounded-xl border border-white/[0.08] bg-white/[0.06] px-4 py-2.5 text-sm text-white placeholder:text-white/20 outline-none focus:border-indigo-500/50" />
          <input value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Description (optional)" className="w-full rounded-xl border border-white/[0.08] bg-white/[0.06] px-4 py-2.5 text-sm text-white placeholder:text-white/20 outline-none focus:border-indigo-500/50" />

          <div className="grid grid-cols-2 gap-3">
            <label className={`cursor-pointer rounded-xl border-2 p-3 text-center text-sm font-medium transition ${programType === 'primary' ? 'border-indigo-600 bg-indigo-500/10 text-indigo-400' : 'border-gray-200 text-gray-400'}`}>
              <input type="radio" name="programType" value="primary" checked={programType === 'primary'} onChange={() => setProgramType('primary')} className="hidden" />
              Primary Program
            </label>
            <label className={`cursor-pointer rounded-xl border-2 p-3 text-center text-sm font-medium transition ${programType === 'supplementary' ? 'border-indigo-600 bg-indigo-500/10 text-indigo-400' : 'border-gray-200 text-gray-400'}`}>
              <input type="radio" name="programType" value="supplementary" checked={programType === 'supplementary'} onChange={() => setProgramType('supplementary')} className="hidden" />
              Supplementary
            </label>
          </div>

          <input value={catalogQuery} onChange={(event) => setCatalogQuery(event.target.value)} placeholder="Search exercise pool" className="w-full rounded-xl border border-white/[0.08] bg-white/[0.06] px-4 py-2.5 text-sm text-white placeholder:text-white/20 outline-none focus:border-indigo-500/50" />

          <div className="max-h-80 overflow-y-auto rounded-xl border border-white/[0.06] bg-black/10">
            {filteredCatalog.length === 0 ? (
              <p className="p-4 text-sm text-white/35">No exercises found.</p>
            ) : filteredCatalog.map((exercise) => (
              <div key={exercise.id} className="grid gap-3 border-b border-white/[0.04] p-3 last:border-b-0 sm:grid-cols-[auto_1fr_auto] sm:items-center">
                <div className="h-12 w-16 flex-shrink-0 overflow-hidden rounded-lg bg-white/[0.04]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={exercise.imageUrl} alt="" className="h-full w-full object-contain" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-white">{exercise.exerciseName}</p>
                  <p className="truncate text-[10px] uppercase tracking-widest text-white/30">{exercise.category} · {muscleLabel(exercise.primaryMuscles)}</p>
                </div>
                <div className="grid grid-cols-[1fr_auto] gap-2 sm:w-56">
                  <select value={catalogDays[exercise.id] ?? defaultExerciseDay} onChange={(event) => setCatalogDays((prev) => ({ ...prev, [exercise.id]: event.target.value }))} aria-label={`Day for ${exercise.exerciseName}`} className="min-w-0 rounded-lg border border-white/[0.08] bg-white/[0.06] px-2 py-2 text-xs text-white transition focus:outline-none focus:border-indigo-500/50">
                    {dayOptions.map((day) => (
                      <option key={day} value={day} className="bg-gray-900 text-white">{day}</option>
                    ))}
                  </select>
                  <button type="button" onClick={() => addCatalogExercise(exercise)} className="rounded-lg bg-indigo-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-indigo-500">Add</button>
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-3">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-white/30">Selected exercises</p>
            {programExercises.length === 0 ? (
              <p className="py-4 text-center text-sm text-white/30">Add exercises from the pool above.</p>
            ) : (
              <div className="space-y-2">
                {programExercises.map((item, index) => {
                  const exercise = exerciseCatalog.find((entry) => entry.id === item.exerciseId);
                  if (!exercise) return null;

                  return (
                    <div key={item.instanceId} className="rounded-xl border border-white/[0.06] bg-black/10 p-3">
                      <div className="mb-2 flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-white">{index + 1}. {exercise.exerciseName}</p>
                          <p className="text-[10px] uppercase tracking-widest text-white/30">{exercise.category}</p>
                        </div>
                        <button type="button" onClick={() => removeProgramExercise(item.instanceId)} className="rounded-lg bg-red-500/10 px-2.5 py-1.5 text-xs font-bold text-red-300 transition hover:bg-red-500/15">Remove</button>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <select value={item.day} onChange={(event) => updateProgramExercise(item.instanceId, 'day', event.target.value)} aria-label={`Day for ${exercise.exerciseName}`} className="bg-white/[0.06] border border-white/[0.08] rounded-lg px-2 py-2 text-xs text-white focus:outline-none focus:border-indigo-500/50 transition">
                          {dayOptions.map((day) => (
                            <option key={day} value={day} className="bg-gray-900 text-white">{day}</option>
                          ))}
                        </select>
                        <input value={item.sets} onChange={(event) => updateProgramExercise(item.instanceId, 'sets', event.target.value)} placeholder="Sets" inputMode="numeric" className="min-w-0 bg-white/[0.06] border border-white/[0.08] rounded-lg px-2 py-2 text-xs text-white placeholder:text-white/20 focus:outline-none focus:border-indigo-500/50 transition" />
                        <input value={item.reps} onChange={(event) => updateProgramExercise(item.instanceId, 'reps', event.target.value)} placeholder="Reps" className="min-w-0 bg-white/[0.06] border border-white/[0.08] rounded-lg px-2 py-2 text-xs text-white placeholder:text-white/20 focus:outline-none focus:border-indigo-500/50 transition" />
                      </div>
                      <input value={item.notes} onChange={(event) => updateProgramExercise(item.instanceId, 'notes', event.target.value)} placeholder="Notes" className="mt-2 w-full bg-white/[0.06] border border-white/[0.08] rounded-lg px-2 py-2 text-xs text-white placeholder:text-white/20 focus:outline-none focus:border-indigo-500/50 transition" />
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <button type="button" onClick={handleCreateFromPool} disabled={creatingFromPool} className="w-full rounded-xl bg-indigo-600 py-2.5 font-medium text-white transition hover:bg-indigo-700 disabled:opacity-50">
            {creatingFromPool ? 'Creating...' : 'Create Program'}
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.04] p-5">
        <p className="text-xs font-semibold tracking-widest text-white/30 uppercase mb-2">Programs You Own</p>
        <div className="space-y-2">
          {programs.length === 0 ? (
            <p className="text-sm text-white/35">No programs created yet.</p>
          ) : programs.map((program) => (
            <Link key={program.id} href={`/program/${program.id}`} className="block rounded-xl border border-white/[0.06] bg-black/10 px-4 py-3 transition hover:border-white/10 hover:bg-white/[0.05]">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-white">{program.name}</p>
                  <p className="text-[10px] uppercase tracking-widest text-white/30">{program.programType} · {program._count.exercises} exercises</p>
                </div>
                {program.isActive && (
                  <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-300">Active</span>
                )}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}