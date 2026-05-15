import { getAuthUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import ProgressClient from '@/components/progress/ProgressClient';
import { findActivePrimaryProgramForUser } from '@/lib/program-scope';

export default async function ProgressPage() {
  const user = await getAuthUser();
  if (!user) redirect('/login');

  if (!user.isAdmin) {
    const activePrimaryProgram = await findActivePrimaryProgramForUser(user.id);
    if (!activePrimaryProgram) redirect('/welcome');
  }

  const logs = await prisma.workoutLog.findMany({
    where: { userId: user.id },
    include: { exercise: true },
    orderBy: { loggedAt: 'asc' },
  });

  const totalSessions = new Set(
    logs.map(l => l.loggedAt.toISOString().split('T')[0])
  ).size;
  const totalVolume = logs.reduce((sum, l) => sum + l.weight * l.sets * l.reps, 0);
  const totalSets = logs.reduce((sum, l) => sum + l.sets, 0);

  // Group logs by exercise
  const byExercise: Record<string, {
    name: string;
    muscleGroup: string;
    logs: { date: string; weight: number; reps: number; sets: number; volume: number }[];
  }> = {};

  for (const log of logs) {
    const name = log.exercise.name;
    if (!byExercise[name]) {
      byExercise[name] = {
        name,
        muscleGroup: log.exercise.muscleGroup,
        logs: [],
      };
    }
    byExercise[name].logs.push({
      date: log.loggedAt.toISOString().split('T')[0],
      weight: log.weight,
      reps: log.reps,
      sets: log.sets,
      volume: log.weight * log.sets * log.reps,
    });
  }

  // Keep last 20 entries per exercise
  for (const key of Object.keys(byExercise)) {
    byExercise[key].logs = byExercise[key].logs.slice(-20);
  }

  const exerciseNames = Object.keys(byExercise).sort();

  return (
    <main className="min-h-screen bg-[#0A0A0F] pb-10">
      <div className="bg-white/[0.03] border-b border-white/[0.06] px-6 py-4 flex items-center justify-between sticky top-0 backdrop-blur-xl z-10">
        <Link href="/welcome" className="text-white/40 hover:text-white/70 transition text-sm">← Home</Link>
        <p className="text-sm font-bold text-white">My Progress</p>
        <div className="w-10"></div>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-6 w-full">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 mb-6">
          {[
            { label: 'Sessions', value: totalSessions },
            { label: 'Total Sets', value: totalSets },
            { label: 'Volume kg', value: Math.round(totalVolume).toLocaleString() },
          ].map(stat => (
            <div key={stat.label} className="bg-white/[0.04] border border-white/[0.06] rounded-2xl p-4 text-center">
              <p className="text-lg font-extrabold text-white truncate">{stat.value}</p>
              <p className="text-[9px] font-semibold text-white/30 uppercase tracking-widest mt-1">{stat.label}</p>
            </div>
          ))}
        </div>

        {exerciseNames.length === 0 ? (
          <div className="bg-white/[0.04] border border-white/[0.06] rounded-2xl p-10 text-center">
            <p className="text-white/40 text-sm">No workouts logged yet.</p>
            <Link href="/welcome" className="text-indigo-400 text-sm mt-2 inline-block">
              Start your first workout →
            </Link>
          </div>
        ) : (
          <ProgressClient byExercise={byExercise} exerciseNames={exerciseNames} />
        )}
      </div>
    </main>
  );
}
