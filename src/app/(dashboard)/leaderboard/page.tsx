import { getAuthUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import LeaderboardManager from '@/components/admin/LeaderboardManager';
import {
  buildLeaderboard,
  formatDistanceKm,
  formatDuration,
} from '@/lib/leaderboard';

function formatCapturedAt(date: Date) {
  return new Intl.DateTimeFormat('en', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Africa/Johannesburg',
  }).format(date);
}

export default async function LeaderboardPage() {
  const user = await getAuthUser();
  if (!user) redirect('/login');

  const [logs, managementData] = await Promise.all([
    prisma.workoutLog.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        exercise: {
          select: {
            id: true,
            name: true,
            muscleGroup: true,
          },
        },
      },
      orderBy: [
        { exercise: { name: 'asc' } },
        { weight: 'desc' },
        { reps: 'desc' },
        { loggedAt: 'desc' },
      ],
    }),
    user.isAdmin ? Promise.all([
      prisma.user.findMany({
        orderBy: { name: 'asc' },
        select: { id: true, name: true, email: true },
      }),
      prisma.exercise.findMany({
        orderBy: [{ name: 'asc' }, { createdAt: 'desc' }],
        select: { id: true, name: true, muscleGroup: true },
      }),
    ]) : Promise.resolve(null),
  ]);

  const leaderboardByExercise = buildLeaderboard(logs);
  const adminEntries = logs.map((log) => ({
    id: log.id,
    weight: log.weight,
    sets: log.sets,
    reps: log.reps,
    durationSeconds: log.durationSeconds,
    distanceKm: log.distanceKm,
    notes: log.notes,
    loggedAt: log.loggedAt.toISOString(),
    user: log.user,
    exercise: {
      id: log.exercise.id,
      name: log.exercise.name,
    },
  }));

  return (
    <main className="min-h-screen bg-[#0A0A0F] pb-24">
      <div className="bg-white/[0.03] border-b border-white/[0.06] px-6 py-4 flex items-center justify-between sticky top-0 backdrop-blur-xl z-10">
        <Link href="/welcome" className="text-white/40 hover:text-white/70 transition text-sm">← Home</Link>
        <p className="text-sm font-bold text-white">Leaderboard</p>
        <div className="w-10"></div>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-6 w-full">
        <div className="mb-5">
          <p className="text-xs font-semibold tracking-widest text-indigo-400 uppercase mb-1">Leaderboard</p>
          <h1 className="text-2xl font-extrabold tracking-tight text-white">Top 10 users per exercise</h1>
          <p className="text-sm text-white/40 mt-1">
            Strength exercises rank by heaviest lift. Endurance exercises rank by longest distance (meters) then fastest time (mm:ss).
          </p>
        </div>

        {user.isAdmin && managementData && (
          <LeaderboardManager
            initialEntries={adminEntries}
            users={managementData[0]}
            exercises={managementData[1]}
          />
        )}

        {leaderboardByExercise.length === 0 ? (
          <div className="bg-white/[0.04] border border-white/[0.06] rounded-2xl p-10 text-center">
            <p className="text-white/40 text-sm">No exercise entries have been logged yet.</p>
            <Link href="/welcome" className="text-indigo-400 text-sm mt-2 inline-block">
              Back to home →
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {leaderboardByExercise.map((exerciseGroup) => (
              <section
                key={exerciseGroup.exerciseKey}
                className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4"
              >
                <h2 className="text-lg font-extrabold text-white mb-3">{exerciseGroup.exerciseName}</h2>
                <div className="space-y-3">
                  {exerciseGroup.entries.map((entry, index) => (
                    <div
                      key={`${exerciseGroup.exerciseKey}-${entry.userKey}`}
                      className="bg-white/[0.04] border border-white/[0.06] rounded-xl p-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-bold text-white">
                              {index + 1}
                            </span>
                            <p className="truncate text-base font-extrabold text-white">{entry.userName}</p>
                          </div>
                        </div>

                        <div className="text-right">
                          {exerciseGroup.metricType === 'endurance' ? (
                            <>
                              <p className="text-xl font-extrabold tabular-nums text-white">
                                {formatDistanceKm(entry.distanceKm, exerciseGroup.exerciseName)}
                              </p>
                              <p className="text-[10px] font-semibold uppercase tracking-widest text-white/30">
                                {formatDuration(entry.durationSeconds)}
                              </p>
                            </>
                          ) : (
                            <>
                              <p className="text-xl font-extrabold tabular-nums text-white">
                                {`${entry.weight.toLocaleString()}kg`}
                              </p>
                              <p className="text-[10px] font-semibold uppercase tracking-widest text-white/30">
                                {`${entry.reps} reps`}
                              </p>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="mt-3 border-t border-white/[0.06] pt-2">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-white/25">Logged</p>
                        <p className="truncate text-sm font-bold text-white/80">{formatCapturedAt(entry.loggedAt)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
