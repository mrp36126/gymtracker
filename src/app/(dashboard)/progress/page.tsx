import { getAuthUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export default async function ProgressPage() {
  const user = await getAuthUser();
  if (!user) redirect('/login');

  const logs = await prisma.workoutLog.findMany({
    where: { userId: user.id },
    include: { exercise: true },
    orderBy: { loggedAt: 'desc' },
    take: 100,
  });

  const totalSessions = new Set(logs.map(l => l.loggedAt.toISOString().split('T')[0])).size;
  const totalVolume = logs.reduce((sum, l) => sum + l.weight * l.sets * l.reps, 0);
  const totalSets = logs.reduce((sum, l) => sum + l.sets, 0);

  const byExercise = logs.reduce((acc, log) => {
    const name = log.exercise.name;
    if (!acc[name]) acc[name] = [];
    acc[name].push(log);
    return acc;
  }, {} as Record<string, typeof logs>);

  return (
    <main className="min-h-screen bg-[#0A0A0F] pb-10">

      {/* Header */}
      <div className="bg-white/[0.03] border-b border-white/[0.06] px-6 py-4 flex items-center justify-between sticky top-0 backdrop-blur-xl z-10">
        <Link href="/welcome" className="text-white/40 hover:text-white/70 transition text-sm">← Home</Link>
        <p className="text-sm font-bold text-white">My Progress</p>
        <div className="w-10"></div>
      </div>

      <div className="max-w-lg mx-auto px-5 pt-6">

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 mb-7">
          {[
            { label: 'Sessions', value: totalSessions },
            { label: 'Total Sets', value: totalSets },
            { label: 'Volume (kg)', value: Math.round(totalVolume).toLocaleString() },
          ].map(stat => (
            <div key={stat.label} className="bg-white/[0.04] border border-white/[0.06] rounded-2xl p-4 text-center">
              <p className="text-xl font-extrabold text-white">{stat.value}</p>
              <p className="text-[10px] font-semibold text-white/30 uppercase tracking-widest mt-1">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Per exercise */}
        {Object.keys(byExercise).length === 0 ? (
          <div className="bg-white/[0.04] border border-white/[0.06] rounded-2xl p-10 text-center">
            <p className="text-white/40 text-sm">No workouts logged yet.</p>
            <Link href="/welcome" className="text-indigo-400 text-sm mt-2 inline-block hover:text-indigo-300 transition">
              Start your first workout →
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs font-semibold tracking-widest text-white/30 uppercase mb-2">Exercise History</p>
            {Object.entries(byExercise).map(([name, exerciseLogs]) => {
              const best = Math.max(...exerciseLogs.map(l => l.weight));
              const latest = exerciseLogs[0];
              const prev = exerciseLogs[1];
              const improved = prev ? latest.weight > prev.weight : false;
              return (
                <div key={name} className="bg-white/[0.04] border border-white/[0.06] rounded-2xl p-5">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="font-bold text-white text-sm">{name}</p>
                      <p className="text-[10px] text-white/30 uppercase tracking-widest mt-0.5">
                        {exerciseLogs[0].exercise.muscleGroup}
                      </p>
                    </div>
                    <span className="text-[10px] font-bold bg-indigo-500/15 text-indigo-400 px-2.5 py-1 rounded-full border border-indigo-500/20">
                      PR {best}kg
                    </span>
                  </div>
                  <div className="bg-white/[0.04] rounded-xl p-3 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] text-white/30 uppercase tracking-widest mb-1">Latest</p>
                      <p className="text-sm font-semibold text-white">
                        {latest.weight}kg · {latest.sets} sets · {latest.reps} reps
                      </p>
                    </div>
                    {improved && (
                      <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-full">
                        ▲ Improving
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-white/20 mt-2">{exerciseLogs.length} sessions logged</p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
