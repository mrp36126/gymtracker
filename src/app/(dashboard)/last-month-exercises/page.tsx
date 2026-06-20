import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getAuthUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

function formatLogSummary(log: {
  weight: number;
  reps: number;
  sets: number;
  durationSeconds: number | null;
  distanceKm: number | null;
}) {
  if (log.durationSeconds && log.distanceKm) {
    const minutes = Math.floor(log.durationSeconds / 60);
    const seconds = log.durationSeconds % 60;
    return `${minutes}:${String(seconds).padStart(2, '0')} min · ${log.distanceKm} km`;
  }

  if (log.durationSeconds) {
    const minutes = Math.floor(log.durationSeconds / 60);
    const seconds = log.durationSeconds % 60;
    return `${minutes}:${String(seconds).padStart(2, '0')} min`;
  }

  if (log.distanceKm) {
    return `${log.weight} kg · ${log.distanceKm} km`;
  }

  return `${log.weight} kg · ${log.sets} sets × ${log.reps} reps`;
}

export default async function LastMonthExercisesPage() {
  const user = await getAuthUser();
  if (!user) redirect('/login');
  if (!user.isTrainerUser) redirect('/welcome');

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [trainerProfile, logs] = await Promise.all([
    user.trainerId
      ? prisma.user.findUnique({
          where: { id: user.trainerId },
          select: { name: true },
        })
      : Promise.resolve(null),
    prisma.workoutLog.findMany({
      where: {
        userId: user.id,
        loggedAt: { gte: thirtyDaysAgo },
      },
      include: {
        exercise: {
          select: {
            name: true,
            muscleGroup: true,
            program: { select: { name: true } },
          },
        },
      },
      orderBy: { loggedAt: 'desc' },
      take: 250,
    }),
  ]);

  return (
    <main className="min-h-screen bg-[#0A0A0F] pb-10">
      <div className="bg-white/[0.03] border-b border-white/[0.06] px-6 py-4 flex items-center justify-between sticky top-0 backdrop-blur-xl z-10">
        <Link href="/welcome" className="text-white/40 hover:text-white/70 transition text-sm">← Home</Link>
        <p className="text-sm font-bold text-white">My Last Month&apos;s Exercises</p>
        <div className="w-10"></div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-6 w-full">
        <div className="mb-5 rounded-2xl border border-indigo-500/20 bg-indigo-500/[0.06] p-5">
          <p className="text-xs font-semibold tracking-widest text-indigo-300/70 uppercase mb-2">Trainer-loaded work</p>
          <p className="text-2xl font-extrabold text-white tracking-tight">Last 30 Days</p>
          <p className="text-sm text-white/45 mt-1">
            {trainerProfile?.name ? `Program guidance from ${trainerProfile.name}.` : 'Program guidance from your assigned trainer.'}
          </p>
          <p className="text-sm text-white/45">{logs.length} logged set{logs.length === 1 ? '' : 's'} in the past month.</p>
        </div>

        {logs.length === 0 ? (
          <div className="bg-white/[0.04] border border-white/[0.06] rounded-2xl p-10 text-center">
            <p className="text-white/40 text-sm">No exercises were logged in the last 30 days.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {logs.map((log) => (
              <div key={log.id} className="bg-white/[0.04] border border-white/[0.06] rounded-2xl p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-extrabold text-white">{log.exercise.name}</p>
                    <p className="text-[10px] uppercase tracking-widest text-white/30 mt-0.5">
                      {log.exercise.muscleGroup} · {log.exercise.program.name}
                    </p>
                  </div>
                  <p className="text-xs font-semibold text-white/45">
                    {new Date(log.loggedAt).toLocaleDateString()} {new Date(log.loggedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <p className="mt-3 text-sm font-bold text-white/80">{formatLogSummary(log)}</p>
                {log.notes && (
                  <p className="mt-2 text-xs text-white/40">{log.notes}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}