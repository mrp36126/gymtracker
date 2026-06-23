'use client';
import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { ExerciseCatalogItem } from '@/types';
import { getExpectedExerciseImageNames, hasPendingCardImage } from '@/lib/exercise-images';

interface Program {
  id: string;
  name: string;
  isActive: boolean;
  createdAt: Date;
  description?: string | null;
  programType: string;
  _count: { exercises: number };
  assignedUsers?: AssignableUser[];
}

interface AssignableUser {
  id: string;
  name: string;
  email: string;
  isAdmin?: boolean;
  isTrainer?: boolean;
  isTrainerUser?: boolean;
}

interface Props {
  programs: Program[];
  users: AssignableUser[];
  waitingUsers: AssignableUser[];
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

const dayOptions = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
const defaultExerciseDay = dayOptions[0];

function muscleLabel(muscles: string[]) {
  return muscles.length > 0 ? muscles.join(', ') : 'Not specified';
}

export default function AdminProgramManager({ programs: initial, users, waitingUsers, exerciseCatalog }: Props) {
  const router = useRouter();
  const [programs, setPrograms] = useState(initial);
  const [catalog, setCatalog] = useState(exerciseCatalog);
  const [managedUsers, setManagedUsers] = useState(users);
  const [pendingUsers, setPendingUsers] = useState(waitingUsers);
  const [uploading, setUploading] = useState(false);
  const [creatingFromPool, setCreatingFromPool] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [activating, setActivating] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [assigning, setAssigning] = useState<string | null>(null);
  const [updatingRole, setUpdatingRole] = useState<string | null>(null);
  const [deletingUser, setDeletingUser] = useState<string | null>(null);
  const [selectedUsers, setSelectedUsers] = useState<Record<string, string>>({});
  const [editName, setEditName] = useState('');
  const [newName, setNewName] = useState('');
  const [description, setDescription] = useState('');
  const [programType, setProgramType] = useState<'primary' | 'supplementary'>('primary');
  const [catalogQuery, setCatalogQuery] = useState('');
  const [catalogDays, setCatalogDays] = useState<Record<string, string>>({});
  const [programExercises, setProgramExercises] = useState<SelectedProgramExercise[]>([]);
  const [exerciseModalOpen, setExerciseModalOpen] = useState(false);
  const [exerciseModalMode, setExerciseModalMode] = useState<'create' | 'edit'>('create');
  const [editingExerciseId, setEditingExerciseId] = useState<string | null>(null);
  const [exerciseForm, setExerciseForm] = useState({
    id: '',
    exerciseName: '',
    category: '',
    primaryMuscles: '',
    secondaryMuscles: '',
    equipment: '',
    difficulty: '',
    description: '',
    instructions: '',
    imageUrl: '',
    detailImageUrl: '',
  });
  const [exerciseSaving, setExerciseSaving] = useState(false);
  const [cardImageFile, setCardImageFile] = useState<File | null>(null);
  const [detailImageFile, setDetailImageFile] = useState<File | null>(null);
  const [exerciseDeletingId, setExerciseDeletingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const showSuccess = (msg: string) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(''), 3000);
  };

  const handleUpload = async () => {
    if (!selectedFile || !newName.trim()) {
      setError('Please enter a program name and select a CSV file');
      return;
    }
    setUploading(true);
    setError('');
    const fd = new FormData();
    fd.append('file', selectedFile);
    fd.append('name', newName.trim());
    fd.append('programType', programType);
    fd.append('description', description.trim());
    try {
      const res = await fetch('/api/programs', { method: 'POST', body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setPrograms(prev => [{
        ...json.data,
        _count: { exercises: json.data.exercises?.length ?? 0 },
      }, ...prev]);
      showSuccess('Program "' + newName + '" uploaded successfully!');
      setNewName('');
      setDescription('');
      setSelectedFile(null);
      setProgramType('primary');
      router.refresh();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setUploading(false);
    }
  };

  const handleRename = async (id: string) => {
    if (!editName.trim()) return;
    setError('');
    try {
      const res = await fetch('/api/programs/' + id, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName.trim() }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setPrograms(prev => prev.map(p => p.id === id ? { ...p, name: editName.trim() } : p));
      setEditingId(null);
      showSuccess('Program renamed!');
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleActivate = async (id: string) => {
    setActivating(id);
    setError('');
    try {
      const res = await fetch('/api/programs/' + id + '/activate', { method: 'POST' });
      if (!res.ok) throw new Error('Failed to activate');
      const activatedType = programs.find(p => p.id === id)?.programType;
      setPrograms(prev => prev.map(p =>
        p.programType === activatedType
          ? { ...p, isActive: p.id === id }
          : p
      ));
      showSuccess('Program activated!');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setActivating(null);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm('Delete "' + name + '"? This cannot be undone.')) return;
    setDeleting(id);
    setError('');
    try {
      const res = await fetch('/api/programs/' + id, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to delete');
      const deletedProgram = programs.find(program => program.id === id);
      setPrograms(prev => prev.filter(program =>
        program.id !== id
        && (
          !deletedProgram
          || program.name !== deletedProgram.name
          || program.programType !== deletedProgram.programType
        )
      ));
      const deletedCount = json.deletedProgramIds?.length ?? 1;
      showSuccess(
        '"' + name + '" deleted' +
        (deletedCount > 1 ? ' for ' + deletedCount + ' program copies.' : '.')
      );
    } catch (e: any) {
      setError(e.message);
    } finally {
      setDeleting(null);
    }
  };

  const filteredCatalog = catalog.filter(exercise => {
    const query = catalogQuery.trim().toLowerCase();
    if (!query) return true;

    return [
      exercise.exerciseName,
      exercise.category,
      exercise.equipment,
      exercise.difficulty,
      exercise.description,
      ...exercise.primaryMuscles,
      ...exercise.secondaryMuscles,
    ].join(' ').toLowerCase().includes(query);
  });

  const addCatalogExercise = (exercise: ExerciseCatalogItem) => {
    const day = catalogDays[exercise.id] ?? defaultExerciseDay;
    setProgramExercises(prev => [
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

  const resetExerciseForm = () => {
    setExerciseForm({
      id: '',
      exerciseName: '',
      category: '',
      primaryMuscles: '',
      secondaryMuscles: '',
      equipment: '',
      difficulty: '',
      description: '',
      instructions: '',
      imageUrl: '',
      detailImageUrl: '',
    });
    setCardImageFile(null);
    setDetailImageFile(null);
    setEditingExerciseId(null);
  };

  const openCreateExerciseModal = () => {
    setExerciseModalMode('create');
    resetExerciseForm();
    setExerciseModalOpen(true);
  };

  const openEditExerciseModal = (exercise: ExerciseCatalogItem) => {
    setExerciseModalMode('edit');
    setEditingExerciseId(exercise.id);
    setExerciseForm({
      id: exercise.id,
      exerciseName: exercise.exerciseName,
      category: exercise.category,
      primaryMuscles: exercise.primaryMuscles.join(', '),
      secondaryMuscles: exercise.secondaryMuscles.join(', '),
      equipment: exercise.equipment,
      difficulty: exercise.difficulty,
      description: exercise.description,
      instructions: exercise.instructions,
      imageUrl: exercise.imageUrl || '',
      detailImageUrl: exercise.detailImageUrl || '',
    });
    setExerciseModalOpen(true);
  };

  const parseMuscles = (value: string) => value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  const uploadExerciseImage = async (exerciseId: string, file: File, mediaKind: 'card' | 'detail') => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('mediaKind', mediaKind);

    const response = await fetch(`/api/exercises/${exerciseId}/media`, {
      method: 'POST',
      body: formData,
    });
    const json = await response.json();
    if (!response.ok) {
      throw new Error(json.error || `Failed to upload ${mediaKind} image`);
    }

    return json.data as { imageUrl?: string | null; detailImageUrl?: string | null };
  };

  const handleSaveExercise = async () => {
    setExerciseSaving(true);
    setError('');
    try {
      const payload = {
        exerciseName: exerciseForm.exerciseName.trim(),
        category: exerciseForm.category.trim(),
        primaryMuscles: parseMuscles(exerciseForm.primaryMuscles),
        secondaryMuscles: parseMuscles(exerciseForm.secondaryMuscles),
        equipment: exerciseForm.equipment.trim(),
        difficulty: exerciseForm.difficulty.trim(),
        description: exerciseForm.description.trim(),
        instructions: exerciseForm.instructions.trim(),
      };

      const endpoint = exerciseModalMode === 'create'
        ? '/api/exercises'
        : `/api/exercises/${editingExerciseId}`;
      const method = exerciseModalMode === 'create' ? 'POST' : 'PATCH';

      const body = exerciseModalMode === 'create'
        ? { id: exerciseForm.id.trim() || undefined, ...payload }
        : payload;

      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || 'Failed to save exercise');

      const normalizedExercise: ExerciseCatalogItem = {
        id: json.data.id,
        exerciseName: json.data.exerciseName,
        category: json.data.category,
        primaryMuscles: json.data.primaryMuscles,
        secondaryMuscles: json.data.secondaryMuscles,
        equipment: json.data.equipment,
        difficulty: json.data.difficulty,
        description: json.data.description,
        instructions: json.data.instructions,
        imageUrl: json.data.imageUrl || '',
        detailImageUrl: json.data.detailImageUrl || '',
      };

      if (cardImageFile) {
        const uploadData = await uploadExerciseImage(normalizedExercise.id, cardImageFile, 'card');
        normalizedExercise.imageUrl = uploadData.imageUrl || normalizedExercise.imageUrl;
      }

      if (detailImageFile) {
        const uploadData = await uploadExerciseImage(normalizedExercise.id, detailImageFile, 'detail');
        normalizedExercise.detailImageUrl = uploadData.detailImageUrl || normalizedExercise.detailImageUrl;
      }

      setExerciseForm((current) => ({
        ...current,
        imageUrl: normalizedExercise.imageUrl || '',
        detailImageUrl: normalizedExercise.detailImageUrl || '',
      }));

      if (exerciseModalMode === 'create') {
        setCatalog((current) => [normalizedExercise, ...current]);
        showSuccess('Exercise created.');
      } else {
        setCatalog((current) => current.map((item) => item.id === normalizedExercise.id ? normalizedExercise : item));
        showSuccess('Exercise updated.');
      }

      setExerciseModalOpen(false);
      resetExerciseForm();
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Failed to save exercise');
    } finally {
      setExerciseSaving(false);
    }
  };

  const handleDeleteExercise = async (exercise: ExerciseCatalogItem) => {
    if (!confirm(`Delete "${exercise.exerciseName}" from the exercise catalog?`)) return;

    setExerciseDeletingId(exercise.id);
    setError('');
    try {
      const response = await fetch(`/api/exercises/${exercise.id}`, { method: 'DELETE' });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || 'Failed to delete exercise');

      setCatalog((current) => current.filter((item) => item.id !== exercise.id));
      showSuccess('Exercise deleted.');
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Failed to delete exercise');
    } finally {
      setExerciseDeletingId(null);
    }
  };

  const updateProgramExercise = (
    instanceId: string,
    field: 'day' | 'sets' | 'reps' | 'notes',
    value: string,
  ) => {
    setProgramExercises(prev => prev.map(item =>
      item.instanceId === instanceId ? { ...item, [field]: value } : item
    ));
  };

  const removeProgramExercise = (instanceId: string) => {
    setProgramExercises(prev => prev.filter(item => item.instanceId !== instanceId));
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
    const exercises = programExercises.map(item => {
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
      setPrograms(prev => [{
        ...json.data,
        _count: { exercises: json.data.exercises?.length ?? 0 },
      }, ...prev]);
      showSuccess('Program "' + newName + '" created from exercise pool!');
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

  const handleAssign = async (program: Program, explicitTargetUserId?: string) => {
    const targetUserId = explicitTargetUserId ?? selectedUsers[program.id];
    if (!targetUserId) {
      setError('Please choose a user before assigning this program');
      return;
    }

    setAssigning(program.id);
    setError('');
    try {
      const res = await fetch('/api/admin/program-assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceProgramId: program.id,
          targetUserId,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);

      const assignedUser = managedUsers.find(user => user.id === targetUserId);
      if (assignedUser) {
        setPrograms(prev => prev.map(existingProgram =>
          existingProgram.name === program.name && existingProgram.programType === program.programType
            ? {
                ...existingProgram,
                assignedUsers: [
                  ...(existingProgram.assignedUsers ?? []).filter(user => user.id !== assignedUser.id),
                  assignedUser,
                ].sort((a, b) => a.name.localeCompare(b.name) || a.email.localeCompare(b.email)),
              }
            : existingProgram
        ));
      }
      if (program.programType === 'primary') {
        setPendingUsers(prev => prev.filter(user => user.id !== targetUserId));
      }
      showSuccess(
        '"' + program.name + '" assigned to ' +
        (assignedUser ? `${assignedUser.name} (${assignedUser.email})` : 'selected user') +
        ' and set active.'
      );
    } catch (e: any) {
      setError(e.message);
    } finally {
      setAssigning(null);
    }
  };

  const handleRoleChange = async (
    targetUser: AssignableUser,
    updates: { isAdmin?: boolean; isTrainer?: boolean; isTrainerUser?: boolean },
    successMessage: string
  ) => {
    setUpdatingRole(targetUser.id);
    setError('');
    try {
      const res = await fetch('/api/admin/users/' + targetUser.id + '/role', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setManagedUsers(prev => prev.map(user =>
        user.id === targetUser.id ? { ...user, ...updates } : user
      ));
      showSuccess(targetUser.name + ' ' + successMessage);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setUpdatingRole(null);
    }
  };

  const handleDeleteUser = async (targetUser: AssignableUser) => {
    if (!confirm(
      'Delete "' + targetUser.name + '"? This will permanently remove their account, programs, workout history, and app data. They will need to register again to use the app.'
    )) return;

    setDeletingUser(targetUser.id);
    setError('');
    try {
      const res = await fetch('/api/admin/users/' + targetUser.id, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);

      setManagedUsers(prev => prev.filter(user => user.id !== targetUser.id));
      setPendingUsers(prev => prev.filter(user => user.id !== targetUser.id));
      showSuccess(targetUser.name + ' was deleted.');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setDeletingUser(null);
    }
  };

  const primaryPrograms = programs.filter(p => p.programType === 'primary');
  const supplementaryPrograms = programs.filter(p => p.programType === 'supplementary');

  return (
    <div className="space-y-6">

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-red-400 text-sm whitespace-pre-wrap">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 text-emerald-400 text-sm">
          {success}
        </div>
      )}

      <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold tracking-widest text-amber-300/70 uppercase mb-2">
              Waiting for Assignment
            </p>
            <p className="text-lg font-bold text-white">
              {pendingUsers.length} user{pendingUsers.length === 1 ? '' : 's'} waiting for program assignment
            </p>
          </div>
          <div className="min-w-10 h-10 rounded-full bg-amber-400/10 border border-amber-300/20 flex items-center justify-center text-amber-300 font-bold">
            {pendingUsers.length}
          </div>
        </div>

        {pendingUsers.length === 0 ? (
          <p className="text-sm text-white/45 mt-3">
            Everyone currently has an active primary program.
          </p>
        ) : (
          <div className="mt-4 space-y-2">
            {pendingUsers.map(waitingUser => (
              <a
                key={waitingUser.id}
                href={`#assign-${waitingUser.id}`}
                className="bg-white/[0.03] border border-white/[0.05] rounded-xl px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 hover:border-amber-300/30 hover:bg-white/[0.05] transition"
              >
                <div>
                  <p className="text-sm font-semibold text-white">{waitingUser.name}</p>
                  <p className="text-xs text-white/40">{waitingUser.email}</p>
                </div>
                <p className="text-xs font-semibold text-amber-300">Assign program →</p>
              </a>
            ))}
          </div>
        )}
      </div>

      {/* Create new program */}
      <div className="bg-white/[0.04] border border-white/[0.06] rounded-2xl overflow-hidden">
        <div className="bg-indigo-600/20 border-b border-indigo-500/20 px-5 py-3">
          <h2 className="text-white font-bold text-sm">Create Program From Exercise Pool</h2>
        </div>
        <div className="p-5 space-y-3">

          <input
            type="text"
            placeholder="Program name (e.g. Push Pull Legs)"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            className="w-full bg-white/[0.06] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-indigo-500/50 transition"
          />

          <input
            type="text"
            placeholder="Description (optional) e.g. Afternoon conditioning"
            value={description}
            onChange={e => setDescription(e.target.value)}
            className="w-full bg-white/[0.06] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-indigo-500/50 transition"
          />

          <div className="grid grid-cols-2 gap-3">
            <label className={'flex-1 cursor-pointer rounded-xl border-2 p-3 text-center text-sm font-medium transition ' + (programType === 'primary' ? 'border-indigo-600 bg-indigo-500/10 text-indigo-400' : 'border-gray-200 text-gray-400 hover:border-gray-300')}>
              <input
                type="radio"
                name="programType"
                value="primary"
                checked={programType === 'primary'}
                onChange={() => setProgramType('primary')}
                className="hidden"
              />
              Primary Program
              <p className="text-xs font-normal mt-0.5 opacity-70">Daily workout, day-based</p>
            </label>
            <label className={'flex-1 cursor-pointer rounded-xl border-2 p-3 text-center text-sm font-medium transition ' + (programType === 'supplementary' ? 'border-indigo-600 bg-indigo-500/10 text-indigo-400' : 'border-gray-200 text-gray-400 hover:border-gray-300')}>
              <input
                type="radio"
                name="programType"
                value="supplementary"
                checked={programType === 'supplementary'}
                onChange={() => setProgramType('supplementary')}
                className="hidden"
              />
              Supplementary
              <p className="text-xs font-normal mt-0.5 opacity-70">Extra program e.g. Hyrox</p>
            </label>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-white/30">Search Exercise Pool</p>
              <button
                type="button"
                onClick={openCreateExerciseModal}
                className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-bold text-emerald-300 transition hover:border-emerald-400/50 hover:bg-emerald-500/15"
              >
                Add New Exercise
              </button>
            </div>
            <input
              type="text"
              placeholder="Search exercise pool"
              value={catalogQuery}
              onChange={e => setCatalogQuery(e.target.value)}
              className="w-full bg-white/[0.06] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-indigo-500/50 transition"
            />
            <div className="mt-3 max-h-80 overflow-y-auto rounded-xl border border-white/[0.06] bg-black/10">
              {filteredCatalog.length === 0 ? (
                <p className="p-4 text-sm text-white/35">No exercises found.</p>
              ) : filteredCatalog.map(exercise => (
                <div key={exercise.id} className="grid gap-3 border-b border-white/[0.04] p-3 last:border-b-0 sm:grid-cols-[auto_1fr_auto] sm:items-center">
                  <div className="w-28 flex-shrink-0">
                    <div className="h-16 w-full overflow-hidden rounded-lg border border-white/[0.08] bg-white/[0.04]">
                      {hasPendingCardImage(exercise) ? (
                        <div className="flex h-full w-full items-center justify-center text-[10px] font-semibold uppercase tracking-widest text-white/35">
                          Pending image
                        </div>
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={exercise.imageUrl} alt={exercise.exerciseName} className="h-full w-full object-contain" />
                      )}
                    </div>
                    {hasPendingCardImage(exercise) && (
                      <p className="mt-1 text-[10px] text-white/35">Expected: {getExpectedExerciseImageNames(exercise).card}</p>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-white">{exercise.exerciseName}</p>
                    <p className="truncate text-[10px] uppercase tracking-widest text-white/30">
                      {exercise.category} · {muscleLabel(exercise.primaryMuscles)}
                    </p>
                    {!exercise.detailImageUrl && (
                      <p className="mt-1 text-[10px] text-amber-300/80">Detail image pending: {getExpectedExerciseImageNames(exercise).detail}</p>
                    )}
                  </div>
                  <div className="grid grid-cols-[1fr_auto_auto_auto] gap-2 sm:w-[24rem]">
                    <select
                      value={catalogDays[exercise.id] ?? defaultExerciseDay}
                      onChange={e => setCatalogDays(prev => ({ ...prev, [exercise.id]: e.target.value }))}
                      aria-label={`Day for ${exercise.exerciseName}`}
                      className="min-w-0 rounded-lg border border-white/[0.08] bg-white/[0.06] px-2 py-2 text-xs text-white transition focus:outline-none focus:border-indigo-500/50"
                    >
                      {dayOptions.map(day => (
                        <option key={day} value={day} className="bg-gray-900 text-white">
                          {day}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => addCatalogExercise(exercise)}
                      className="rounded-lg bg-indigo-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-indigo-500"
                    >
                      Add
                    </button>
                    <button
                      type="button"
                      onClick={() => openEditExerciseModal(exercise)}
                      className="rounded-lg border border-white/[0.12] bg-white/[0.06] px-3 py-2 text-xs font-bold text-white/70 transition hover:border-white/30 hover:text-white"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteExercise(exercise)}
                      disabled={exerciseDeletingId === exercise.id}
                      className="rounded-lg bg-red-500/10 px-3 py-2 text-xs font-bold text-red-300 transition hover:bg-red-500/15 disabled:opacity-50"
                    >
                      {exerciseDeletingId === exercise.id ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-3">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-white/30">
                Selected exercises
              </p>
              <p className="text-[10px] text-white/30">{programExercises.length} total</p>
            </div>

            {programExercises.length === 0 ? (
              <p className="py-4 text-center text-sm text-white/30">Add exercises from the pool above.</p>
            ) : (
              <div className="space-y-2">
                {programExercises.map((item, index) => {
                  const exercise = catalog.find(ex => ex.id === item.exerciseId);
                  if (!exercise) return null;

                  return (
                    <div key={item.instanceId} className="rounded-xl border border-white/[0.06] bg-black/10 p-3">
                      <div className="mb-2 flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-white">{index + 1}. {exercise.exerciseName}</p>
                          <p className="text-[10px] uppercase tracking-widest text-white/30">{exercise.category}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeProgramExercise(item.instanceId)}
                          className="rounded-lg bg-red-500/10 px-2.5 py-1.5 text-xs font-bold text-red-300 transition hover:bg-red-500/15"
                        >
                          Remove
                        </button>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <select
                          value={item.day}
                          onChange={e => updateProgramExercise(item.instanceId, 'day', e.target.value)}
                          aria-label={`Selected day for ${exercise.exerciseName}`}
                          className="bg-white/[0.06] border border-white/[0.08] rounded-lg px-2 py-2 text-xs text-white focus:outline-none focus:border-indigo-500/50 transition"
                        >
                          {dayOptions.map(day => (
                            <option key={day} value={day} className="bg-gray-900 text-white">
                              {day}
                            </option>
                          ))}
                        </select>
                        <input
                          value={item.sets}
                          onChange={e => updateProgramExercise(item.instanceId, 'sets', e.target.value)}
                          placeholder="Sets"
                          inputMode="numeric"
                          className="min-w-0 bg-white/[0.06] border border-white/[0.08] rounded-lg px-2 py-2 text-xs text-white placeholder:text-white/20 focus:outline-none focus:border-indigo-500/50 transition"
                        />
                        <input
                          value={item.reps}
                          onChange={e => updateProgramExercise(item.instanceId, 'reps', e.target.value)}
                          placeholder="Reps"
                          className="min-w-0 bg-white/[0.06] border border-white/[0.08] rounded-lg px-2 py-2 text-xs text-white placeholder:text-white/20 focus:outline-none focus:border-indigo-500/50 transition"
                        />
                      </div>
                      <input
                        value={item.notes}
                        onChange={e => updateProgramExercise(item.instanceId, 'notes', e.target.value)}
                        placeholder="Notes"
                        className="mt-2 w-full bg-white/[0.06] border border-white/[0.08] rounded-lg px-2 py-2 text-xs text-white placeholder:text-white/20 focus:outline-none focus:border-indigo-500/50 transition"
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <button
            onClick={handleCreateFromPool}
            disabled={creatingFromPool}
            className="w-full bg-indigo-600 text-white rounded-xl py-2.5 font-medium hover:bg-indigo-700 disabled:opacity-50 transition">
            {creatingFromPool ? 'Creating...' : 'Create Program'}
          </button>
        </div>
      </div>

      {/* Upload new program */}
      <div className="bg-white/[0.04] border border-white/[0.06] rounded-2xl overflow-hidden">
        <div className="bg-white/[0.04] border-b border-white/[0.06] px-5 py-3">
          <h2 className="text-white font-bold text-sm">Upload Program CSV</h2>
        </div>
        <div className="p-5 space-y-3">
          <div
            onClick={() => fileRef.current?.click()}
            className="cursor-pointer border border-dashed border-white/[0.1] rounded-xl p-6 text-center text-white/30 hover:border-indigo-500/40 transition">
            {selectedFile ? (
              <p className="text-indigo-600 font-medium">{selectedFile.name}</p>
            ) : (
              <p className="text-sm">Click to select a CSV file</p>
            )}
            <input
              ref={fileRef}
              type="file"
              accept=".csv"
              aria-label="Upload program CSV file"
              className="hidden"
              onChange={e => setSelectedFile(e.target.files?.[0] ?? null)}
            />
          </div>

          <button
            onClick={handleUpload}
            disabled={uploading}
            className="w-full bg-indigo-600 text-white rounded-xl py-2.5 font-medium hover:bg-indigo-700 disabled:opacity-50 transition">
            {uploading ? 'Uploading & parsing...' : 'Upload Program'}
          </button>
        </div>
      </div>

      {pendingUsers.length > 0 && (
        <div className="bg-white/[0.04] border border-white/[0.06] rounded-2xl overflow-hidden">
          <div className="bg-amber-500/10 border-b border-amber-500/20 px-5 py-3">
            <h2 className="text-white font-bold text-sm">Quick Assign</h2>
          </div>
          <div className="p-5 space-y-3">
            {pendingUsers.map(waitingUser => (
              <div
                key={waitingUser.id}
                id={`assign-${waitingUser.id}`}
                className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-4 scroll-mt-24"
              >
                <div className="mb-3">
                  <p className="text-sm font-bold text-white">{waitingUser.name}</p>
                  <p className="text-xs text-white/40">{waitingUser.email}</p>
                </div>
                <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                  <select
                    value={selectedUsers[`quick-${waitingUser.id}`] ?? ''}
                    onChange={e => setSelectedUsers(prev => ({
                      ...prev,
                      [`quick-${waitingUser.id}`]: e.target.value,
                    }))}
                    aria-label={`Select program for ${waitingUser.name}`}
                    className="bg-white/[0.06] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500/50 transition"
                  >
                    <option value="">Choose a program</option>
                    {programs.map(program => (
                      <option key={program.id} value={program.id}>
                        {program.name} ({program.programType})
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => {
                      const selectedProgram = programs.find(program => program.id === selectedUsers[`quick-${waitingUser.id}`]);
                      if (!selectedProgram) {
                        setError('Please choose a program before assigning it');
                        return;
                      }
                      setSelectedUsers(prev => ({ ...prev, [selectedProgram.id]: waitingUser.id }));
                      handleAssign(selectedProgram, waitingUser.id);
                    }}
                    disabled={!selectedUsers[`quick-${waitingUser.id}`]}
                    className="text-xs bg-purple-600 text-white px-3 py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50 transition"
                  >
                    Assign Program
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white/[0.04] border border-white/[0.06] rounded-2xl overflow-hidden">
        <div className="bg-cyan-600/20 border-b border-cyan-500/20 px-5 py-3 flex items-center justify-between">
          <h2 className="text-white font-bold text-sm">User Admin Access</h2>
          <span className="text-cyan-300/60 text-xs">{managedUsers.length} user{managedUsers.length === 1 ? '' : 's'}</span>
        </div>
        <div className="divide-y divide-white/[0.04]">
          {managedUsers.map(user => (
            <div key={user.id} className="p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold text-white">{user.name}</p>
                  {!user.isAdmin && !user.isTrainer && !user.isTrainerUser && (
                    <span className="text-[10px] font-bold text-slate-300 bg-slate-500/10 border border-slate-500/20 px-2 py-0.5 rounded-full">
                      Individual User
                    </span>
                  )}
                  {user.isAdmin && (
                    <span className="text-[10px] font-bold text-cyan-300 bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded-full">
                      Admin
                    </span>
                  )}
                  {user.isTrainer && (
                    <span className="text-[10px] font-bold text-violet-300 bg-violet-500/10 border border-violet-500/20 px-2 py-0.5 rounded-full">
                      Trainer
                    </span>
                  )}
                  {user.isTrainerUser && (
                    <span className="text-[10px] font-bold text-amber-300 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
                      Trainer User
                    </span>
                  )}
                </div>
                <p className="text-xs text-white/40 mt-1">{user.email}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => handleRoleChange(
                    user,
                    { isAdmin: true, isTrainer: false, isTrainerUser: false },
                    'is now an admin.'
                  )}
                  disabled={updatingRole === user.id || deletingUser === user.id}
                  className={
                    'text-xs px-3 py-2 rounded-lg transition disabled:opacity-50 ' +
                    (user.isAdmin
                      ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-500/30'
                      : 'bg-cyan-600 text-white hover:bg-cyan-700')
                  }
                >
                  {updatingRole === user.id ? 'Updating...' : 'Make Admin'}
                </button>
                <button
                  onClick={() => handleRoleChange(
                    user,
                    { isAdmin: false, isTrainer: true, isTrainerUser: false },
                    'is now a trainer.'
                  )}
                  disabled={updatingRole === user.id || deletingUser === user.id}
                  className={
                    'text-xs px-3 py-2 rounded-lg transition disabled:opacity-50 ' +
                    (user.isTrainer
                      ? 'bg-violet-500/20 text-violet-200 border border-violet-500/30'
                      : 'bg-violet-600 text-white hover:bg-violet-700')
                  }
                >
                  {updatingRole === user.id ? 'Updating...' : 'Make Trainer'}
                </button>
                <button
                  onClick={() => handleRoleChange(
                    user,
                    { isAdmin: false, isTrainer: false, isTrainerUser: true },
                    'is now a trainer user.'
                  )}
                  disabled={updatingRole === user.id || deletingUser === user.id}
                  className={
                    'text-xs px-3 py-2 rounded-lg transition disabled:opacity-50 ' +
                    (user.isTrainerUser
                      ? 'bg-amber-500/20 text-amber-200 border border-amber-500/30'
                      : 'bg-amber-600 text-white hover:bg-amber-700')
                  }
                >
                  {updatingRole === user.id ? 'Updating...' : 'Make Trainer User'}
                </button>
                <button
                  onClick={() => handleRoleChange(
                    user,
                    { isAdmin: false, isTrainer: false, isTrainerUser: false },
                    'is now an individual user.'
                  )}
                  disabled={updatingRole === user.id || deletingUser === user.id || (!user.isAdmin && !user.isTrainer && !user.isTrainerUser)}
                  className="text-xs bg-slate-600 text-white px-3 py-2 rounded-lg hover:bg-slate-700 disabled:opacity-50 transition"
                >
                  {updatingRole === user.id ? 'Updating...' : 'Make Individual User'}
                </button>
                <button
                  onClick={() => handleDeleteUser(user)}
                  disabled={deletingUser === user.id || updatingRole === user.id}
                  className="text-xs bg-red-600 text-white px-3 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50 transition"
                >
                  {deletingUser === user.id ? 'Deleting...' : 'Delete User'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Primary Programs */}
      <div className="bg-white/[0.04] border border-white/[0.06] rounded-2xl overflow-hidden">
        <div className="bg-indigo-600/20 border-b border-indigo-500/20 px-5 py-3 flex items-center justify-between">
          <h2 className="text-white font-bold text-sm">Primary Programs</h2>
          <span className="text-indigo-300/60 text-xs">{primaryPrograms.length} program{primaryPrograms.length !== 1 ? 's' : ''}</span>
        </div>

        {primaryPrograms.length === 0 ? (
          <div className="p-8 text-center text-white/30">
            <p>No primary programs yet.</p>
          </div>
        ) : (
          <div className="divide-y divide-white/[0.04]">
            {primaryPrograms.map(program => (
              <ProgramRow
                key={program.id}
                program={program}
                editingId={editingId}
                editName={editName}
                activating={activating}
                deleting={deleting}
                setEditingId={setEditingId}
                setEditName={setEditName}
                onRename={handleRename}
                onActivate={handleActivate}
                onDelete={handleDelete}
                users={managedUsers}
                selectedUserId={selectedUsers[program.id] ?? ''}
                assigning={assigning}
                onSelectUser={(userId) => setSelectedUsers(prev => ({ ...prev, [program.id]: userId }))}
                onAssign={handleAssign}
              />
            ))}
          </div>
        )}
      </div>

      {/* Supplementary Programs */}
      <div className="bg-white/[0.04] border border-white/[0.06] rounded-2xl overflow-hidden">
        <div className="bg-purple-600/20 border-b border-purple-500/20 px-5 py-3 flex items-center justify-between">
          <h2 className="text-white font-bold text-sm">Supplementary Programs</h2>
          <span className="text-purple-300/60 text-xs">{supplementaryPrograms.length} program{supplementaryPrograms.length !== 1 ? 's' : ''}</span>
        </div>

        {supplementaryPrograms.length === 0 ? (
          <div className="p-8 text-center text-white/30">
            <p>No supplementary programs yet. Upload a Hyrox or conditioning program above.</p>
          </div>
        ) : (
          <div className="divide-y divide-white/[0.04]">
            {supplementaryPrograms.map(program => (
              <ProgramRow
                key={program.id}
                program={program}
                editingId={editingId}
                editName={editName}
                activating={activating}
                deleting={deleting}
                setEditingId={setEditingId}
                setEditName={setEditName}
                onRename={handleRename}
                onActivate={handleActivate}
                onDelete={handleDelete}
                users={managedUsers}
                selectedUserId={selectedUsers[program.id] ?? ''}
                assigning={assigning}
                onSelectUser={(userId) => setSelectedUsers(prev => ({ ...prev, [program.id]: userId }))}
                onAssign={handleAssign}
              />
            ))}
          </div>
        )}
      </div>

      {exerciseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-white/[0.08] bg-[#0A0A0F] p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">
                {exerciseModalMode === 'create' ? 'Add New Exercise' : 'Edit Exercise'}
              </h3>
              <button
                type="button"
                onClick={() => setExerciseModalOpen(false)}
                className="rounded-lg border border-white/[0.12] bg-white/[0.05] px-3 py-1.5 text-xs font-bold text-white/60 transition hover:text-white"
              >
                Close
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {exerciseModalMode === 'create' && (
                <input value={exerciseForm.id} onChange={(event) => setExerciseForm((prev) => ({ ...prev, id: event.target.value }))} placeholder="Exercise ID (optional, e.g. bench-press)" className="rounded-xl border border-white/[0.08] bg-white/[0.06] px-4 py-2.5 text-sm text-white placeholder:text-white/25 outline-none focus:border-indigo-500/50 sm:col-span-2" />
              )}
              <input value={exerciseForm.exerciseName} onChange={(event) => setExerciseForm((prev) => ({ ...prev, exerciseName: event.target.value }))} placeholder="Exercise name" className="rounded-xl border border-white/[0.08] bg-white/[0.06] px-4 py-2.5 text-sm text-white placeholder:text-white/25 outline-none focus:border-indigo-500/50" />
              <input value={exerciseForm.category} onChange={(event) => setExerciseForm((prev) => ({ ...prev, category: event.target.value }))} placeholder="Category" className="rounded-xl border border-white/[0.08] bg-white/[0.06] px-4 py-2.5 text-sm text-white placeholder:text-white/25 outline-none focus:border-indigo-500/50" />
              <input value={exerciseForm.equipment} onChange={(event) => setExerciseForm((prev) => ({ ...prev, equipment: event.target.value }))} placeholder="Equipment" className="rounded-xl border border-white/[0.08] bg-white/[0.06] px-4 py-2.5 text-sm text-white placeholder:text-white/25 outline-none focus:border-indigo-500/50" />
              <input value={exerciseForm.difficulty} onChange={(event) => setExerciseForm((prev) => ({ ...prev, difficulty: event.target.value }))} placeholder="Difficulty" className="rounded-xl border border-white/[0.08] bg-white/[0.06] px-4 py-2.5 text-sm text-white placeholder:text-white/25 outline-none focus:border-indigo-500/50" />
              <input value={exerciseForm.primaryMuscles} onChange={(event) => setExerciseForm((prev) => ({ ...prev, primaryMuscles: event.target.value }))} placeholder="Primary muscles (comma separated)" className="rounded-xl border border-white/[0.08] bg-white/[0.06] px-4 py-2.5 text-sm text-white placeholder:text-white/25 outline-none focus:border-indigo-500/50 sm:col-span-2" />
              <input value={exerciseForm.secondaryMuscles} onChange={(event) => setExerciseForm((prev) => ({ ...prev, secondaryMuscles: event.target.value }))} placeholder="Secondary muscles (comma separated)" className="rounded-xl border border-white/[0.08] bg-white/[0.06] px-4 py-2.5 text-sm text-white placeholder:text-white/25 outline-none focus:border-indigo-500/50 sm:col-span-2" />
              <textarea value={exerciseForm.description} onChange={(event) => setExerciseForm((prev) => ({ ...prev, description: event.target.value }))} rows={3} placeholder="Description" className="rounded-xl border border-white/[0.08] bg-white/[0.06] px-4 py-2.5 text-sm text-white placeholder:text-white/25 outline-none focus:border-indigo-500/50 sm:col-span-2" />
              <textarea value={exerciseForm.instructions} onChange={(event) => setExerciseForm((prev) => ({ ...prev, instructions: event.target.value }))} rows={4} placeholder="Instructions" className="rounded-xl border border-white/[0.08] bg-white/[0.06] px-4 py-2.5 text-sm text-white placeholder:text-white/25 outline-none focus:border-indigo-500/50 sm:col-span-2" />
              <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-3 sm:col-span-2">
                <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-white/35">Card image</p>
                {exerciseForm.imageUrl ? (
                  <div className="mb-2 overflow-hidden rounded-lg border border-white/[0.08] bg-white/[0.04]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={exerciseForm.imageUrl} alt="Card preview" className="h-32 w-full object-contain" />
                  </div>
                ) : (
                  <div className="mb-2 flex h-24 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.04] text-[10px] font-semibold uppercase tracking-widest text-white/35">
                    Pending image upload
                  </div>
                )}
                <p className="mb-2 text-[10px] text-white/35">
                  Expected filename: {getExpectedExerciseImageNames({ id: exerciseForm.id || 'new-exercise', exerciseName: exerciseForm.exerciseName || 'exercise-name' }).card}
                </p>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  onChange={(event) => setCardImageFile(event.target.files?.[0] ?? null)}
                  aria-label="Upload card image"
                  className="w-full rounded-lg border border-white/[0.08] bg-white/[0.06] px-3 py-2 text-xs text-white file:mr-3 file:rounded-md file:border-0 file:bg-indigo-600 file:px-2 file:py-1 file:text-xs file:font-bold file:text-white"
                />
              </div>

              <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-3 sm:col-span-2">
                <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-white/35">Detail image</p>
                {exerciseForm.detailImageUrl ? (
                  <div className="mb-2 overflow-hidden rounded-lg border border-white/[0.08] bg-white/[0.04]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={exerciseForm.detailImageUrl} alt="Detail preview" className="h-32 w-full object-contain" />
                  </div>
                ) : (
                  <div className="mb-2 flex h-24 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.04] text-[10px] font-semibold uppercase tracking-widest text-white/35">
                    Pending detail upload
                  </div>
                )}
                <p className="mb-2 text-[10px] text-white/35">
                  Expected filename: {getExpectedExerciseImageNames({ id: exerciseForm.id || 'new-exercise', exerciseName: exerciseForm.exerciseName || 'exercise-name' }).detail}
                </p>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  onChange={(event) => setDetailImageFile(event.target.files?.[0] ?? null)}
                  aria-label="Upload detail image"
                  className="w-full rounded-lg border border-white/[0.08] bg-white/[0.06] px-3 py-2 text-xs text-white file:mr-3 file:rounded-md file:border-0 file:bg-indigo-600 file:px-2 file:py-1 file:text-xs file:font-bold file:text-white"
                />
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-amber-500/20 bg-amber-500/[0.07] p-3 text-xs text-amber-200/90">
              Images can be uploaded or replaced later. If left blank, users will see a professional placeholder with expected filename convention.
            </div>

            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setExerciseModalOpen(false)}
                className="rounded-xl border border-white/[0.12] bg-white/[0.04] px-4 py-2 text-sm font-bold text-white/65 transition hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveExercise}
                disabled={exerciseSaving}
                className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-emerald-500 disabled:opacity-60"
              >
                {exerciseSaving ? 'Saving...' : exerciseModalMode === 'create' ? 'Create Exercise' : 'Update Exercise'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Extracted row component to keep things clean
interface RowProps {
  program: Program;
  editingId: string | null;
  editName: string;
  activating: string | null;
  deleting: string | null;
  setEditingId: (id: string | null) => void;
  setEditName: (name: string) => void;
  onRename: (id: string) => void;
  onActivate: (id: string) => void;
  onDelete: (id: string, name: string) => void;
  users: AssignableUser[];
  selectedUserId: string;
  assigning: string | null;
  onSelectUser: (userId: string) => void;
  onAssign: (program: Program, explicitTargetUserId?: string) => void;
}

function ProgramRow({
  program, editingId, editName, activating, deleting,
  setEditingId, setEditName, onRename, onActivate, onDelete,
  users, selectedUserId, assigning, onSelectUser, onAssign,
}: RowProps) {
  return (
    <div className="p-5">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          {editingId === program.id ? (
            <div className="flex gap-2">
              <input
                type="text"
                value={editName}
                onChange={e => setEditName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && onRename(program.id)}
                aria-label={`Edit name for ${program.name}`}
                className="flex-1 bg-white/[0.06] border border-indigo-500/40 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-indigo-500 transition"
                autoFocus
              />
              <button
                onClick={() => onRename(program.id)}
                className="bg-indigo-600 text-white text-xs px-3 py-1.5 rounded-lg hover:bg-indigo-700 transition">
                Save
              </button>
              <button
                onClick={() => setEditingId(null)}
                className="bg-white/[0.06] text-white/40 text-xs px-3 py-1.5 rounded-lg hover:bg-gray-200 transition">
                Cancel
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-bold text-white">{program.name}</p>
              {program.isActive && (
                <span className="text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-medium">
                  Active
                </span>
              )}
            </div>
          )}
          {program.description && (
            <p className="text-xs text-white/40 mt-0.5">{program.description}</p>
          )}
          <p className="text-xs text-gray-300 mt-1">
            {program._count.exercises} exercises · Added {new Date(program.createdAt).toLocaleDateString()}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {!program.isActive && (
          <button
            onClick={() => onActivate(program.id)}
            disabled={activating === program.id}
            className="text-xs bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 disabled:opacity-50 transition">
            {activating === program.id ? 'Activating...' : 'Set Active'}
          </button>
        )}

        <button
          onClick={() => { setEditingId(program.id); setEditName(program.name); }}
          className="text-xs bg-indigo-500/10 text-indigo-400 px-3 py-1.5 rounded-lg hover:bg-indigo-100 transition">
          Rename
        </button>

        <Link
          href={'/program/' + program.id}
          className="text-xs bg-white/[0.04] text-white/50 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition">
          View Exercises
        </Link>

        <Link
          href="/admin/media"
          className="text-xs bg-white/[0.04] text-white/50 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition">
          Manage Media
        </Link>

        {!program.isActive && (
          <button
            onClick={() => onDelete(program.id, program.name)}
            disabled={deleting === program.id}
            className="text-xs bg-red-500/10 text-red-400 px-3 py-1.5 rounded-lg hover:bg-red-100 disabled:opacity-50 transition ml-auto">
            {deleting === program.id ? 'Deleting...' : 'Delete'}
          </button>
        )}
      </div>

      <div className="mt-4 pt-4 border-t border-white/[0.05]">
        <p className="text-[10px] font-semibold tracking-widest text-white/25 uppercase mb-2">
          Assign to user
        </p>
        {users.length === 0 ? (
          <p className="text-xs text-white/30">No other users available yet.</p>
        ) : (
          <div className="flex flex-col sm:flex-row gap-2">
            <select
              value={selectedUserId}
              onChange={e => onSelectUser(e.target.value)}
              aria-label={`Assign ${program.name} to user`}
              className="flex-1 bg-white/[0.06] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500/50 transition"
            >
              <option value="">Choose a user</option>
              {users.map(user => (
                <option key={user.id} value={user.id}>
                  {user.name} ({user.email})
                </option>
              ))}
            </select>
            <button
              onClick={() => onAssign(program)}
              disabled={!selectedUserId || assigning === program.id}
              className="text-xs bg-purple-600 text-white px-3 py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50 transition"
            >
              {assigning === program.id ? 'Assigning...' : 'Assign Program'}
            </button>
          </div>
        )}
      </div>

      {program.isActive && (
        <p className="text-[10px] text-white/20 mt-2">
          Active programs cannot be deleted. Set another program active first.
        </p>
      )}

      <div className="mt-4 border-t border-white/[0.05] pt-4">
        <p className="text-[10px] font-semibold tracking-widest text-white/25 uppercase mb-2">
          Assigned users
        </p>
        {program.assignedUsers && program.assignedUsers.length > 0 ? (
          <div className="space-y-1.5">
            {program.assignedUsers.map(user => (
              <div key={user.id} className="rounded-lg border border-emerald-500/15 bg-emerald-500/[0.04] px-3 py-2">
                <p className="text-xs font-semibold text-white">{user.name}</p>
                <p className="text-[10px] text-white/35">{user.email}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-white/30">No active user assignments.</p>
        )}
      </div>
    </div>
  );
}

