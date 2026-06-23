'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface AssignedTrainerUser {
  id: string;
  name: string;
  email: string;
}

interface Props {
  assignedUsers: AssignedTrainerUser[];
}

const SELECTED_TRAINER_USERS_STORAGE_KEY = 'gymtracker.selectedTrainerUserIds';

export default function TrainerHomeOptions({ assignedUsers }: Props) {
  const router = useRouter();
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);

  useEffect(() => {
    const storedRaw = window.localStorage.getItem(SELECTED_TRAINER_USERS_STORAGE_KEY);
    const parsedStoredIds = storedRaw ? JSON.parse(storedRaw) : [];
    const storedIds = Array.isArray(parsedStoredIds) ? parsedStoredIds.filter((id): id is string => typeof id === 'string') : [];
    const validStoredIds = storedIds.filter((id) => assignedUsers.some((user) => user.id === id));
    const fallbackIds = assignedUsers[0] ? [assignedUsers[0].id] : [];
    const nextIds = validStoredIds.length > 0 ? validStoredIds : fallbackIds;

    setSelectedUserIds(nextIds);

    if (nextIds.length > 0) {
      window.localStorage.setItem(SELECTED_TRAINER_USERS_STORAGE_KEY, JSON.stringify(nextIds));
    } else {
      window.localStorage.removeItem(SELECTED_TRAINER_USERS_STORAGE_KEY);
    }
  }, [assignedUsers]);

  const selectedUsers = useMemo(
    () => assignedUsers.filter((user) => selectedUserIds.includes(user.id)),
    [assignedUsers, selectedUserIds],
  );
  const selectedUser = selectedUsers[0] ?? null;

  const toggleSelectedUser = (nextUserId: string) => {
    setSelectedUserIds((current) => {
      const next = current.includes(nextUserId)
        ? current.filter((id) => id !== nextUserId)
        : [...current, nextUserId];

      if (next.length > 0) {
        window.localStorage.setItem(SELECTED_TRAINER_USERS_STORAGE_KEY, JSON.stringify(next));
      } else {
        window.localStorage.removeItem(SELECTED_TRAINER_USERS_STORAGE_KEY);
      }

      return next;
    });
  };

  const handleSelectOnly = (nextUserId: string) => {
    setSelectedUserIds([nextUserId]);
    window.localStorage.setItem(SELECTED_TRAINER_USERS_STORAGE_KEY, JSON.stringify([nextUserId]));
  };

  const handleSelectAll = () => {
    const allIds = assignedUsers.map((user) => user.id);
    setSelectedUserIds(allIds);
    if (allIds.length > 0) {
      window.localStorage.setItem(SELECTED_TRAINER_USERS_STORAGE_KEY, JSON.stringify(allIds));
      return;
    }
    window.localStorage.removeItem(SELECTED_TRAINER_USERS_STORAGE_KEY);
  };

  const handleStartWorkout = () => {
    if (selectedUserIds.length === 0) return;
    router.push(`/trainer/session?userIds=${encodeURIComponent(selectedUserIds.join(','))}`);
  };

  const handleOpenProgress = () => {
    if (!selectedUser) return;
    router.push(`/progress?userId=${selectedUser.id}`);
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <Link href="/custom-workout" className="block">
          <div className="relative h-full rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.06] p-5 transition hover:border-emerald-400/40 hover:bg-emerald-500/[0.1]">
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-emerald-300/70">My Own Workout</p>
            <p className="text-xl font-extrabold tracking-tight text-white">Train like an individual user</p>
            <p className="mt-2 text-sm leading-6 text-white/45">Open the same custom workout builder used for self-directed training days.</p>
          </div>
        </Link>

        <Link href="/progress" className="block">
          <div className="relative h-full rounded-2xl border border-purple-500/20 bg-purple-500/[0.06] p-5 transition hover:border-purple-400/40 hover:bg-purple-500/[0.1]">
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-purple-300/70">My Progress</p>
            <p className="text-xl font-extrabold tracking-tight text-white">View your progress charts</p>
            <p className="mt-2 text-sm leading-6 text-white/45">See your own performance trends, personal records, and workout history.</p>
          </div>
        </Link>

        <Link href="/bmi" className="block">
          <div className="relative h-full rounded-2xl border border-cyan-500/20 bg-cyan-500/[0.06] p-5 transition hover:border-cyan-400/40 hover:bg-cyan-500/[0.1]">
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-cyan-300/70">BMI</p>
            <p className="text-xl font-extrabold tracking-tight text-white">Capture weight and height</p>
            <p className="mt-2 text-sm leading-6 text-white/45">Track your body mass index from your latest entered values.</p>
          </div>
        </Link>

        <div className="rounded-2xl border border-indigo-500/20 bg-indigo-500/[0.06] p-5 md:col-span-2 xl:col-span-1">
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-indigo-300/70">Select Who To Train Today</p>
          <p className="text-xl font-extrabold tracking-tight text-white">Pick one or more trainees</p>
          <p className="mt-2 text-sm leading-6 text-white/45">Load one shared exercise plan for all selected trainees, then toggle between them while capturing sets, reps, weight, time, and distance.</p>

          <div className="mt-4 space-y-3">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleSelectAll}
                disabled={assignedUsers.length === 0}
                className="rounded-lg border border-white/[0.1] bg-white/[0.06] px-3 py-1.5 text-xs font-bold text-white/70 transition hover:border-indigo-400/40 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Select all
              </button>
            </div>

            <div className="max-h-52 space-y-2 overflow-y-auto pr-1">
              {assignedUsers.length === 0 ? (
                <p className="rounded-xl border border-white/[0.08] bg-white/[0.05] px-3 py-2 text-sm text-white/45">No assigned users available.</p>
              ) : (
                assignedUsers.map((assignedUser) => {
                  const isSelected = selectedUserIds.includes(assignedUser.id);
                  return (
                    <div key={assignedUser.id} className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => toggleSelectedUser(assignedUser.id)}
                        className={`flex-1 rounded-xl border px-3 py-2 text-left text-sm transition ${
                          isSelected
                            ? 'border-indigo-400/50 bg-indigo-500/20 text-white'
                            : 'border-white/[0.08] bg-white/[0.05] text-white/70 hover:border-indigo-400/30'
                        }`}
                      >
                        <p className="font-bold">{assignedUser.name}</p>
                        <p className="text-xs text-white/40">{assignedUser.email}</p>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSelectOnly(assignedUser.id)}
                        className="rounded-lg border border-white/[0.1] bg-white/[0.06] px-2.5 py-2 text-[10px] font-bold uppercase tracking-widest text-white/55 transition hover:text-white/80"
                      >
                        Only
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            <button
              type="button"
              onClick={handleStartWorkout}
              disabled={selectedUserIds.length === 0}
              className="w-full rounded-xl bg-indigo-600 px-4 py-3 text-sm font-extrabold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/35"
            >
              {selectedUserIds.length > 0
                ? `Load Exercises For ${selectedUserIds.length} ${selectedUserIds.length === 1 ? 'Trainee' : 'Trainees'}`
                : 'Select at least one trainee'}
            </button>
          </div>
        </div>

        <Link href="/admin" className="block">
          <div className="h-full rounded-2xl border border-cyan-500/20 bg-cyan-500/[0.06] p-5 transition hover:border-cyan-400/40 hover:bg-cyan-500/[0.1]">
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-cyan-300/70">Assigned Users</p>
            <p className="text-xl font-extrabold tracking-tight text-white">Manage your trainees</p>
            <p className="mt-2 text-sm leading-6 text-white/45">Review assigned users, claim available trainer users, and remove users you no longer coach.</p>
          </div>
        </Link>

        <button
          type="button"
          onClick={handleOpenProgress}
          disabled={!selectedUser}
          className="h-full rounded-2xl border border-white/[0.08] bg-white/[0.04] p-5 text-left transition hover:border-white/15 hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-white/30">Progress Tracking</p>
          <p className="text-xl font-extrabold tracking-tight text-white">See primary trainee progress</p>
          <p className="mt-2 text-sm leading-6 text-white/45">
            {selectedUser
              ? `Open charts and session history for ${selectedUser.name}.`
              : 'Choose at least one trainee above to open progress tracking.'}
          </p>
        </button>

        <Link href="/leaderboard" className="block">
          <div className="h-full rounded-2xl border border-amber-500/20 bg-amber-500/[0.06] p-5 transition hover:border-amber-400/40 hover:bg-amber-500/[0.1]">
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-amber-300/70">Leaderboard</p>
            <p className="text-xl font-extrabold tracking-tight text-white">View all users</p>
            <p className="mt-2 text-sm leading-6 text-white/45">See the ranking of every user in the app by their best logged lift.</p>
          </div>
        </Link>
      </div>

      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-white/30">Selected Trainees</p>
        <p className="mt-2 text-lg font-bold text-white">
          {selectedUsers.length > 0
            ? selectedUsers.map((user) => user.name).join(', ')
            : 'No trainees selected'}
        </p>
        <p className="mt-1 text-sm text-white/45">
          {selectedUsers.length > 0
            ? `${selectedUsers.length} trainee${selectedUsers.length === 1 ? '' : 's'} ready for a shared session.`
            : 'Assign or select one or more trainer users to start today\'s session and review progress.'}
        </p>
      </div>
    </div>
  );
}