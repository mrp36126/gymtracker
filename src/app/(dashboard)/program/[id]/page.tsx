import { getAuthUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export default async function ProgramDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser();
  if (!user) redirect('/login');

  const { id } = await params;

  const program = await prisma.program.findFirst({
    where: { id },
    include: { exercises: { orderBy: [{ day: 'asc' }, { order: 'asc' }] } },
  });

  if (!program) redirect('/program');

  const dayOrder = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];

  const byDay = program.exercises.reduce((acc, ex) => {
    if (!acc[ex.day]) acc[ex.day] = [];
    acc[ex.day].push(ex);
    return acc;
  }, {} as Record<string, typeof program.exercises>);

  return (
    <main className="min-h-screen bg-[#0A0A0F] pb-10">

      {/* Header */}
      <div className="bg-white/[0.03] border-b border-white/[0.06] px-6 py-4 flex items-center justify-between sticky top-0 backdrop-blur-xl z-10">
        <Link href="/program" className="text-white/40 hover:text-white/70 transition text-sm">← Programs</Link>
        <div className="text-center">
          <p className="text-xs font-semibold text-white/30 uppercase tracking-widest">Program</p>
          <p className="text-sm font-bold text-white">{program.name}</p>
        </div>
        <div className="w-10">
          {program.isActive && (
            <span className="text-[10px] font-bold text-emerald-400">Active</span>
          )}
        </div>
      </div>

      <div className="max-w-lg mx-auto px-5 pt-6">
        {dayOrder.filter(d => byDay[d]).map(day => (
          <div key={day} className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <p className="text-xs font-bold text-white/30 uppercase tracking-widest">{day}</p>
                <div className="h-px w-8 bg-white/[0.05]"></div>
              </div>
              <Link
                href={'/workout/' + day.toLowerCase()}
                className="text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-xl hover:bg-indigo-500 transition font-semibold">
                Start {day} →
              </Link>
            </div>
            <div className="space-y-2">
              {byDay[day].map(ex => (
                <div key={ex.id} className="bg-white/[0.04] border border-white/[0.06] rounded-xl px-4 py-3.5 flex justify-between items-center">
                  <div>
                    <p className="text-sm font-semibold text-white">{ex.name}</p>
                    <p className="text-[10px] text-white/30 uppercase tracking-widest mt-0.5">
                      {ex.muscleGroup} · {ex.defaultSets} sets × {ex.defaultReps} reps
                    </p>
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
