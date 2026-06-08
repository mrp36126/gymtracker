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

  const users = await prisma.user.findMany({
    orderBy: { name: 'asc' },
    include: {
      workoutLogs: {
        orderBy: { weight: 'desc' },
        take: 1,
        include: { exercise: true },
      },
    },
  });

  const leaders = users
    .map((userRecord) => ({
      id: userRecord.id,
      name: userRecord.name,
      bestLift: userRecord.workoutLogs[0] ?? null,
    }))
    .sort((a, b) => {
      if (!a.bestLift && !b.bestLift) return a.name.localeCompare(b.name);
      if (!a.bestLift) return 1;
      if (!b.bestLift) return -1;
      if (b.bestLift.weight !== a.bestLift.weight) return b.bestLift.weight - a.bestLift.weight;
      return a.name.localeCompare(b.name);
    });

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
          <h1 className="text-2xl font-extrabold tracking-tight text-white">All users ranked by heaviest lift</h1>
          <p className="text-sm text-white/40 mt-1">
            All app users are listed from heaviest to lightest best recorded lift.
          </p>
        </div>

        {leaders.length === 0 ? (
          <div className="bg-white/[0.04] border border-white/[0.06] rounded-2xl p-10 text-center">
            <p className="text-white/40 text-sm">No users are available yet.</p>
            <Link href="/welcome" className="text-indigo-400 text-sm mt-2 inline-block">
              Back to home →
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {leaders.map((entry, index) => (
              <div
                key={entry.id}
                className="bg-white/[0.04] border border-white/[0.06] rounded-2xl p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-bold text-white">
                        {index + 1}
                      </span>
                      <p className="truncate text-base font-extrabold text-white">{entry.name}</p>
                    </div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-white/25">
                      {entry.bestLift ? entry.bestLift.exercise.name : 'No lifts logged yet'}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-xl font-extrabold tabular-nums text-white">
                      {entry.bestLift ? `${entry.bestLift.weight.toLocaleString()}kg` : '—'}
                    </p>
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-white/30">
                      {entry.bestLift ? `${entry.bestLift.reps} reps` : ''}
                    </p>
                  </div>
                </div>

                {entry.bestLift && (
                  <div className="mt-4 grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3 border-t border-white/[0.06] pt-3">
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-white/25">Logged</p>
                      <p className="truncate text-sm font-bold text-white/80">{formatCapturedAt(entry.bestLift.loggedAt)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-white/25">Exercise</p>
                      <p className="text-xs font-semibold text-white/55">{entry.bestLift.exercise.name}</p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
