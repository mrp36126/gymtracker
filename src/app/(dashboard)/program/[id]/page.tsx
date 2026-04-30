import { getAuthUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export default async function ProgramDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser();
  if (!user) redirect('/login');

  const { id } = await params;

  const program = await prisma.program.findFirst({
    where: { id, userId: user.id },
    include: { exercises: { orderBy: [{ day: 'asc' }, { order: 'asc' }] } },
  });

  if (!program) redirect('/program');

  const byDay = program.exercises.reduce((acc, ex) => {
    if (!acc[ex.day]) acc[ex.day] = [];
    acc[ex.day].push(ex);
    return acc;
  }, {} as Record<string, typeof program.exercises>);

  const dayOrder = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-indigo-700">{program.name}</h1>
            <p className="text-gray-400 text-sm mt-1">
              {program.isActive ? '✅ Active program' : 'Inactive'}
            </p>
          </div>
          <Link href="/program" className="text-sm text-indigo-600 hover:underline">← Programs</Link>
        </div>

        {dayOrder.filter(d => byDay[d]).map(day => (
          <div key={day} className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-bold text-gray-700">{day}</h2>
              <Link href={`/workout/${day.toLowerCase()}`}
                className="text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700 transition">
                Start {day} Workout →
              </Link>
            </div>
            <div className="space-y-2">
              {byDay[day].map(ex => (
                <div key={ex.id} className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm flex justify-between items-center">
                  <div>
                    <p className="font-medium text-gray-800">{ex.name}</p>
                    <p className="text-xs text-gray-400">{ex.muscleGroup} · {ex.defaultSets} sets × {ex.defaultReps} reps</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
