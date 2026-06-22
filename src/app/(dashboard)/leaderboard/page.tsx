import { getAuthUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import Link from 'next/link';

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
      user: {
        select: {
          id: true,
          name: true,
        },
      },
      exercise: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: [
      { exercise: { name: 'asc' } },
      { weight: 'desc' },
      { reps: 'desc' },
      { loggedAt: 'desc' },
    ],
  });

  const groupedLeaders = new Map<
    string,
    {
      exerciseKey: string;
      exerciseName: string;
      entries: Array<{
        userId: string;
        userName: string;
        weight: number;
        reps: number;
        loggedAt: Date;
      }>;
    }
  >();

  for (const log of logs) {
    const exerciseKey = log.exercise.name.trim().toLowerCase();
    const existingGroup = groupedLeaders.get(exerciseKey);
    if (!existingGroup) {
      groupedLeaders.set(exerciseKey, {
        exerciseKey,
        exerciseName: log.exercise.name,
        entries: [
          {
            userId: log.userId,
            userName: log.user.name,
            weight: log.weight,
            reps: log.reps,
            loggedAt: log.loggedAt,
          },
        ],
      });
      continue;
    }

    const userAlreadyRanked = existingGroup.entries.some((entry) => entry.userId === log.userId);
    if (userAlreadyRanked) continue;

    existingGroup.entries.push({
      userId: log.userId,
      userName: log.user.name,
      weight: log.weight,
      reps: log.reps,
      loggedAt: log.loggedAt,
    });
  }

  const leaderboardByExercise = Array.from(groupedLeaders.values())
    .map((group) => ({
      ...group,
      entries: group.entries.slice(0, 10),
    }))
    .sort((a, b) => a.exerciseName.localeCompare(b.exerciseName));

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
            Each exercise shows up to 10 users ranked by their heaviest recorded lift for that exercise.
          </p>
        </div>

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
                      key={`${exerciseGroup.exerciseKey}-${entry.userId}`}
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
                          <p className="text-xl font-extrabold tabular-nums text-white">
                            {`${entry.weight.toLocaleString()}kg`}
                          </p>
                          <p className="text-[10px] font-semibold uppercase tracking-widest text-white/30">
                            {`${entry.reps} reps`}
                          </p>
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
