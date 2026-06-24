import { getAuthUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import ExerciseCard from '@/components/workout/ExerciseCard';
import type { Exercise } from '@/types';
import Link from 'next/link';
import { findActivePrimaryProgramForUser } from '@/lib/program-scope';
import WorkoutTimerButton from '@/components/timer/WorkoutTimerButton';
import { isAdmin, isTrainer } from '@/lib/rbac';
import { buildWorkoutLogOwnerWhere } from '@/lib/workout-log-identity';

export default async function SupplementaryProgramPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getAuthUser();
  if (!user) redirect('/login');

  if (!isAdmin(user) && !isTrainer(user)) {
    const activePrimaryProgram = await findActivePrimaryProgramForUser(user.id);
    if (!activePrimaryProgram) redirect('/welcome');
  }

  const { id } = await params;

  const program = await prisma.program.findFirst({
    where: {
      id,
      programType: 'supplementary',
      isActive: true,
      userId: user.isTrainerUser && user.trainerId ? user.trainerId : user.id,
    },
    include: {
      exercises: { orderBy: [{ day: 'asc' }, { order: 'asc' }] },
    },
  });

  if (!program) redirect('/welcome');

  const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  const byDay = program.exercises.reduce((acc, ex) => {
    if (!acc[ex.day]) acc[ex.day] = [];
    acc[ex.day].push(ex);
    return acc;
  }, {} as Record<string, typeof program.exercises>);

  const availableDays = dayOrder.filter(d => byDay[d]);

  const exercisesByDay: Record<string, Exercise[]> = {};

  for (const day of availableDays) {
    exercisesByDay[day] = await Promise.all(
      byDay[day].map(async (ex) => {
        const lastLog = await prisma.workoutLog.findFirst({
          where: buildWorkoutLogOwnerWhere(user, { exerciseId: ex.id }),
          orderBy: { loggedAt: 'desc' },
        });
        return { ...ex, lastLog: lastLog ?? null } as Exercise;
      })
    );
  }

  return (
    <main className="min-h-screen bg-[#0A0A0F] pb-10">
      {/* Header */}
      <div className="bg-white/[0.03] border-b border-white/[0.06] px-6 py-4 flex items-center justify-between sticky top-0 backdrop-blur-xl z-10">
        <Link href="/welcome" className="text-white/40 hover:text-white/70 transition text-sm">← Home</Link>
        <div className="text-center">
          <p className="text-xs font-semibold text-white/30 uppercase tracking-widest">Supplementary</p>
          <p className="text-sm font-bold text-white">{program.name}</p>
        </div>
        <WorkoutTimerButton label={program.name} />
      </div>

      <div className="max-w-lg mx-auto px-4 pt-5">
        {program.description && (
          <p className="text-white/40 text-sm mb-5 text-center">{program.description}</p>
        )}

        {/* Day tabs */}
        {availableDays.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-2 mb-6 scrollbar-hide">
            {availableDays.map((day) => (
              <Link
                key={day}
                href={`#${day.toLowerCase()}`}
                className="flex-shrink-0 text-xs bg-white/[0.06] border border-white/[0.08] text-white/60 px-3 py-1.5 rounded-full hover:bg-white/10 hover:text-white transition font-semibold"
              >
                {day}
              </Link>
            ))}
          </div>
        )}

        {/* Exercises by day */}
        {availableDays.map((day) => (
          <div key={day} id={day.toLowerCase()} className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <p className="text-xs font-bold text-white/30 uppercase tracking-widest">{day}</p>
              <div className="h-px flex-1 bg-white/[0.05]"></div>
              <span className="text-[10px] text-white/20">
                {exercisesByDay[day].length} exercises
              </span>
            </div>

            {exercisesByDay[day].map((ex, i) => (
              <div key={ex.id}>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-5 h-5 rounded-full bg-purple-600 flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0">
                    {i + 1}
                  </div>
                  <div className="h-px flex-1 bg-white/[0.04]"></div>
                </div>
                <ExerciseCard exercise={ex} readOnly={user.isTrainerUser} />
              </div>
            ))}
          </div>
        ))}
      </div>
    </main>
  );
}
