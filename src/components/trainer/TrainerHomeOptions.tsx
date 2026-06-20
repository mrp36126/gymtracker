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
  todayName: string;
}

const SELECTED_TRAINER_USER_STORAGE_KEY = 'gymtracker.selectedTrainerUserId';

export default function TrainerHomeOptions({ assignedUsers, todayName }: Props) {
  const router = useRouter();
  const [selectedUserId, setSelectedUserId] = useState('');

  useEffect(() => {
    const storedUserId = window.localStorage.getItem(SELECTED_TRAINER_USER_STORAGE_KEY) ?? '';
    const fallbackUserId = assignedUsers[0]?.id ?? '';
    const nextUserId = assignedUsers.some((user) => user.id === storedUserId) ? storedUserId : fallbackUserId;

    setSelectedUserId(nextUserId);

    if (nextUserId) {
      window.localStorage.setItem(SELECTED_TRAINER_USER_STORAGE_KEY, nextUserId);
    } else {
      window.localStorage.removeItem(SELECTED_TRAINER_USER_STORAGE_KEY);
    }
  }, [assignedUsers]);

  const selectedUser = useMemo(
    () => assignedUsers.find((user) => user.id === selectedUserId) ?? null,
    [assignedUsers, selectedUserId],
  );

  const handleSelectedUserChange = (nextUserId: string) => {
    setSelectedUserId(nextUserId);
    if (nextUserId) {
      window.localStorage.setItem(SELECTED_TRAINER_USER_STORAGE_KEY, nextUserId);
      return;
    }

    window.localStorage.removeItem(SELECTED_TRAINER_USER_STORAGE_KEY);
  };

  const handleStartWorkout = () => {
    if (!selectedUserId) return;
    router.push(`/trainer/session?userId=${selectedUserId}`);
  };

  const handleOpenProgress = () => {
    if (!selectedUserId) return;
    router.push(`/progress?userId=${selectedUserId}`);
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

        <div className="rounded-2xl border border-indigo-500/20 bg-indigo-500/[0.06] p-5 md:col-span-2 xl:col-span-1">
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-indigo-300/70">Select Who To Train Today</p>
          <p className="text-xl font-extrabold tracking-tight text-white">Pick a trainee and start logging</p>
          <p className="mt-2 text-sm leading-6 text-white/45">Use the selected trainee&apos;s active workout for today and capture sets, reps, weight, time, and distance on their behalf.</p>

          <div className="mt-4 space-y-3">
            <select
              value={selectedUserId}
              onChange={(event) => handleSelectedUserChange(event.target.value)}
              className="w-full rounded-xl border border-white/[0.08] bg-white/[0.06] px-4 py-3 text-sm text-white outline-none transition focus:border-indigo-400/50"
              aria-label="Select trainer user for today"
            >
              {assignedUsers.length === 0 ? (
                <option value="">No assigned users available</option>
              ) : (
                assignedUsers.map((assignedUser) => (
                  <option key={assignedUser.id} value={assignedUser.id} className="bg-[#0A0A0F] text-white">
                    {assignedUser.name}
                  </option>
                ))
              )}
            </select>

            <button
              type="button"
              onClick={handleStartWorkout}
              disabled={!selectedUserId}
              className="w-full rounded-xl bg-indigo-600 px-4 py-3 text-sm font-extrabold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/35"
            >
              {selectedUser ? `Load Exercises For ${selectedUser.name}` : 'Select a trainee first'}
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
          disabled={!selectedUserId}
          className="h-full rounded-2xl border border-white/[0.08] bg-white/[0.04] p-5 text-left transition hover:border-white/15 hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-white/30">Progress Tracking</p>
          <p className="text-xl font-extrabold tracking-tight text-white">See selected trainee progress</p>
          <p className="mt-2 text-sm leading-6 text-white/45">
            {selectedUser
              ? `Open charts and session history for ${selectedUser.name}.`
              : 'Choose a trainee above to open progress tracking.'}
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
        <p className="text-xs font-semibold uppercase tracking-widest text-white/30">Selected Trainee</p>
        <p className="mt-2 text-lg font-bold text-white">{selectedUser?.name ?? 'No trainee selected'}</p>
        <p className="mt-1 text-sm text-white/45">{selectedUser?.email ?? 'Assign or select a trainer user to start today\'s session and review progress.'}</p>
      </div>
    </div>
  );
}