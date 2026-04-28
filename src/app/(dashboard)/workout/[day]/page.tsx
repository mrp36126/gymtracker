// src/app/(dashboard)/workout/[day]/page.tsx
import { getAuthUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import ExerciseCard from '@/components/workout/ExerciseCard';
import type { Exercise } from '@/types';

interface Props { params: { day: string } }

export default async function WorkoutDayPage({ params }: { params: Promise<{ day: string }> }) {
  const user = await getAuthUser();
  if (!user) redirect('/login');

    const { day: rawDay } = await params;
  const day = rawDay.charAt(0).toUpperCase() + rawDay.slice(1);

  const program = await prisma.program.findFirst({
    where: { userId: user.id, isActive: true },
  });

  if (!program) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-500">No active program. Please upload one first.</p>
      </div>
    );
  }

  const exercises = await prisma.exercise.findMany({
    where: { programId: program.id, day },
    orderBy: { order: 'asc' },
  });

  const exercisesWithLogs: Exercise[] = await Promise.all(
    exercises.map(async ex => {
      const lastLog = await prisma.workoutLog.findFirst({
        where: { exerciseId: ex.id, userId: user.id },
        orderBy: { loggedAt: 'desc' },
      });
      return { ...ex, defaultReps: ex.defaultReps, lastLog: lastLog ?? null } as Exercise;
    })
  );

  if (exercisesWithLogs.length === 0) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-500">No exercises scheduled for {day}. Enjoy your rest day! 🎉</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold text-indigo-700 mb-1">{day} Workout</h1>
      <p className="text-gray-400 text-sm mb-6">{program.name}</p>
      {exercisesWithLogs.map(ex => (
        <ExerciseCard key={ex.id} exercise={ex} />
      ))}
    </div>
  );
}
