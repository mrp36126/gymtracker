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
    take: 50,
  });

  const totalSessions = new Set(logs.map(l => l.loggedAt.toISOString().split('T')[0])).size;
  const totalVolume = logs.reduce((sum, l) => sum + l.weight * l.sets * l.reps, 0);

  const byExercise = logs.reduce((acc, log) => {
    const name = log.exercise.name;
    if (!acc[name]) acc[name] = [];
    acc[name].push(log);
    return acc;
  }, {} as Record<string, typeof logs>);

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-indigo-700">My Progress</h1>
            <p className="text-gray-400 text-sm mt-1">Track your gains over time</p>
          </div>
          <Link href="/welcome" className="text-sm text-indigo-600 hover:underline">← Back</Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm text-center">
            <p className="text-3xl font-bold text-indigo-700">{totalSessions}</p>
            <p className="text-sm text-gray-400 mt-1">Sessions logged</p>
          </div>
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm text-center">
            <p className="text-3xl font-bold text-indigo-700">{Math.round(totalVolume).toLocaleString()}</p>
            <p className="text-sm text-gray-400 mt-1">Total volume (kg)</p>
          </div>
        </div>

        {/* Per exercise */}
        {Object.keys(byExercise).length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center border border-gray-100">
            <p className="text-gray-400">No workouts logged yet.</p>
            <Link href="/welcome" className="text-indigo-600 text-sm mt-2 inline-block hover:underline">
              Start your first workout →
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(byExercise).map(([name, exerciseLogs]) => {
              const best = Math.max(...exerciseLogs.map(l => l.weight));
              const latest = exerciseLogs[0];
              return (
                <div key={name} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="font-bold text-gray-800">{name}</p>
                      <p className="text-xs text-gray-400">{exerciseLogs[0].exercise.muscleGroup}</p>
                    </div>
                    <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full font-medium">
                      PR: {best}kg
                    </span>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-3 text-sm">
                    <p className="text-gray-500 text-xs mb-1">Latest session</p>
                    <p className="text-gray-700 font-medium">
                      {latest.weight}kg · {latest.sets} sets · {latest.reps} reps
                    </p>
                  </div>
                  <p className="text-xs text-gray-300 mt-2">{exerciseLogs.length} sessions logged</p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
