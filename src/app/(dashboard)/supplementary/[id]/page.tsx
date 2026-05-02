import { getAuthUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import ExerciseCard from '@/components/workout/ExerciseCard';
import type { Exercise } from '@/types';
import Link from 'next/link';

export default async function SupplementaryProgramPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getAuthUser();
  if (!user) redirect('/login');

  const { id } = await params;

  const program = await prisma.program.findFirst({
    where: { id, programType: 'supplementary', isActive: true },
    include: {
      exercises: { orderBy: [{ day: 'asc' }, { order: 'asc' }] },
    },
  });

  if (!program) redirect('/welcome');

  // Group by day
  const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  const byDay = program.exercises.reduce((acc, ex) => {
    if (!acc[ex.day]) acc[ex.day] = [];
    acc[ex.day].push(ex);
    return acc;
  }, {} as Record<string, typeof program.exercises>);

  const availableDays = dayOrder.filter(d => byDay[d]);

  // Attach last log to each exercise
  const exercisesByDay: Record<string, Exercise[]> = {};

  for (const day of availableDays) {
    exercisesByDay[day] = await Promise.all(
      byDay[day].map(async (ex) => {
        const lastLog = await prisma.workoutLog.findFirst({
          where: { exerciseId: ex.id, userId: user.id },
          orderBy: { loggedAt: 'desc' },
        });
        return { ...ex, lastLog: lastLog ?? null } as Exercise;
      })
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-bold text-indigo-700">{program.name}</h1>
          <Link href="/welcome" className="text-sm text-indigo-600 hover:underline">
            ← Home
          </Link>
        </div>

        {program.description && (
          <p className="text-gray-400 text-sm mb-6">{program.description}</p>
        )}

        {/* Day tabs */}
        {availableDays.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-2 mb-6">
            {availableDays.map((day) => (
              <Link
                key={day}
                href={`#${day.toLowerCase()}`}
                className="flex-shrink-0 text-xs bg-white border border-indigo-200 text-indigo-700
                  px-3 py-1.5 rounded-full hover:bg-indigo-50 transition font-medium"
              >
                {day}
              </Link>
            ))}
          </div>
        )}

        {/* Exercises by day */}
        {availableDays.map((day) => (
          <div key={day} id={day.toLowerCase()} className="mb-8">
            <h2 className="text-lg font-bold text-gray-700 mb-3 pb-2 border-b border-gray-200">
              {day}
            </h2>
            {exercisesByDay[day].map((ex) => (
              <ExerciseCard key={ex.id} exercise={ex} />
            ))}
          </div>
        ))}
      </div>
    </main>
  );
}
