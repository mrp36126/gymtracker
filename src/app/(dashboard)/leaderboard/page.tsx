import { getAuthUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import Link from 'next/link';

interface LeaderboardEntry {
  exerciseName: string;
  muscleGroup: string;
  userName: string;
  weight: number;
  reps: number;
  loggedAt: Date;
}

function normalizeExerciseName(name: string) {
  return name.trim().replace(/\s+/g, ' ').toLowerCase();
}

function formatCapturedAt(date: Date) {
  return new Intl.DateTimeFormat('en', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

export default async function LeaderboardPage() {
  const user = await getAuthUser();
  if (!user) redirect('/login');

  const logs = await prisma.workoutLog.findMany({
    include: {
      exercise: true,
      user: {
        select: {
          name: true,
        },
      },
    },
    orderBy: [
      { weight: 'desc' },
      { loggedAt: 'asc' },
    ],
  });

  const bestByExercise = new Map<string, LeaderboardEntry>();

  for (const log of logs) {
    const key = normalizeExerciseName(log.exercise.name);
    if (bestByExercise.has(key)) continue;

    bestByExercise.set(key, {
      exerciseName: log.exercise.name,
      muscleGroup: log.exercise.muscleGroup,
      userName: log.user.name,
      weight: log.weight,
      reps: log.reps,
      loggedAt: log.loggedAt,
    });
  }

  const leaders = Array.from(bestByExercise.values()).sort((a, b) =>
    a.exerciseName.localeCompare(b.exerciseName)
  );

  return (
    <main className="min-h-screen bg-[#0A0A0F] pb-24">
      <div className="bg-white/[0.03] border-b border-white/[0.06] px-6 py-4 flex items-center justify-between sticky top-0 backdrop-blur-xl z-10">
        <Link href="/welcome" className="text-white/40 hover:text-white/70 transition text-sm">â† Home</Link>
        <p className="text-sm font-bold text-white">Leaderboard</p>
        <div className="w-10"></div>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-6 w-full">
        <div className="mb-5">
          <p className="text-xs font-semibold tracking-widest text-indigo-400 uppercase mb-1">Top lifts</p>
          <h1 className="text-2xl font-extrabold tracking-tight text-white">Best Weight By Exercise</h1>
          <p className="text-sm text-white/40 mt-1">
            The heaviest logged set across all users for each exercise.
          </p>
        </div>

        {leaders.length === 0 ? (
          <div className="bg-white/[0.04] border border-white/[0.06] rounded-2xl p-10 text-center">
            <p className="text-white/40 text-sm">No lifts have been logged yet.</p>
            <Link href="/welcome" className="text-indigo-400 text-sm mt-2 inline-block">
              Start a workout â†’
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {leaders.map((entry, index) => (
              <div
                key={normalizeExerciseName(entry.exerciseName)}
                className="bg-white/[0.04] border border-white/[0.06] rounded-2xl p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-bold text-white">
                        {index + 1}
                      </span>
                      <p className="truncate text-sm font-extrabold text-white">{entry.exerciseName}</p>
                    </div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-white/25">
                      {entry.muscleGroup}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-xl font-extrabold tabular-nums text-white">
                      {entry.weight.toLocaleString()}kg
                    </p>
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-white/30">
                      {entry.reps} reps
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3 border-t border-white/[0.06] pt-3">
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-white/25">Leader</p>
                    <p className="truncate text-sm font-bold text-white/80">{entry.userName}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-white/25">Captured</p>
                    <p className="text-xs font-semibold text-white/55">{formatCapturedAt(entry.loggedAt)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
