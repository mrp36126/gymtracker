import { getAuthUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getTodayName } from '@/lib/day-resolver';
import Link from 'next/link';
import { redirect } from 'next/navigation';

export default async function WelcomePage() {
  let user;
  try {
    user = await getAuthUser();
  } catch (err: any) {
    return (
      <main className="min-h-screen bg-[#0A0A0F] flex items-center justify-center p-6">
        <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-6 max-w-lg w-full">
          <p className="text-red-400 font-semibold mb-1">Database error</p>
          <p className="text-red-400/70 text-sm">{err.message}</p>
        </div>
      </main>
    );
  }

  if (!user) redirect('/login');

  const todayName = getTodayName();

  let activeProgram = null;
  let supplementaryPrograms: any[] = [];
  let todayExerciseCount = 0;

  try {
    activeProgram = await prisma.program.findFirst({
      where: { isActive: true, programType: 'primary', userId: user.id },
    });

    if (activeProgram) {
      todayExerciseCount = await prisma.exercise.count({
        where: { programId: activeProgram.id, day: todayName },
      });
    }

    supplementaryPrograms = await prisma.program.findMany({
      where: { isActive: true, programType: 'supplementary', userId: user.id },
      orderBy: { name: 'asc' },
    });
  } catch (err) {}

  const initials = user.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <main className="min-h-screen bg-[#0A0A0F] pb-24">

      {/* Top nav */}
      <nav className="bg-white/[0.03] border-b border-white/[0.06] px-6 py-4 flex items-center justify-between sticky top-0 backdrop-blur-xl z-10">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
          <span className="font-bold text-sm tracking-tight">GymTracker</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-white/40 font-medium">{todayName}</span>
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-xs font-bold">
            {initials}
          </div>
        </div>
      </nav>

      <div className="px-4 pt-7 pb-4 w-full max-w-lg mx-auto">

        {/* Greeting */}
        <div className="mb-7">
          <p className="text-xs font-semibold tracking-widest text-indigo-400 uppercase mb-1">{greeting}</p>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">Hello, {user.name}</h1>
          <p className="text-sm text-white/40 mt-1">
            {activeProgram ? activeProgram.name : 'No active program'} 
            {todayExerciseCount > 0 ? ` · ${todayExerciseCount} exercises today` : ''}
          </p>
        </div>

        {/* Today's primary workout */}
        {activeProgram ? (
          <Link href={'/workout/' + todayName.toLowerCase()} className="block mb-4">
            <div className="relative bg-indigo-600 rounded-2xl p-6 overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-8 translate-x-8"></div>
              <div className="absolute bottom-0 right-16 w-20 h-20 bg-white/5 rounded-full translate-y-6"></div>
              <p className="text-xs font-semibold tracking-widest text-white/60 uppercase mb-2">Today&apos;s Workout</p>
              <p className="text-2xl font-extrabold text-white tracking-tight">{todayName} Session</p>
              <p className="text-sm text-white/60 mt-1">{activeProgram.name}</p>
              <div className="absolute right-6 top-1/2 -translate-y-1/2 text-white/40 text-2xl">→</div>
            </div>
          </Link>
        ) : (
          <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-6 mb-4 text-center">
            <p className="text-white/40 text-sm">No active program</p>
            {user.isAdmin && (
              <Link href="/admin" className="text-indigo-400 text-sm mt-1 inline-block hover:text-indigo-300 transition">
                Go to Admin to activate one →
              </Link>
            )}
          </div>
        )}

        {/* Supplementary programs */}
        {supplementaryPrograms.length > 0 && (
          <div className="mb-4">
            <p className="text-xs font-semibold tracking-widest text-white/30 uppercase mb-3">Additional Programs</p>
            <div className="space-y-3">
              {supplementaryPrograms.map((prog: any) => (
                <Link key={prog.id} href={'/supplementary/' + prog.id} className="block">
                  <div className="bg-white/[0.04] border border-indigo-500/20 rounded-2xl p-5 flex items-center justify-between hover:border-indigo-500/40 transition">
                    <div>
                      <p className="font-bold text-white text-sm">{prog.name}</p>
                      {prog.description && (
                        <p className="text-xs text-white/40 mt-0.5">{prog.description}</p>
                      )}
                    </div>
                    <span className="text-indigo-400 font-bold">→</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Stats row */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <Link href="/progress" className="block">
            <div className="bg-white/[0.04] border border-white/[0.06] rounded-2xl p-5 hover:border-white/10 transition">
              <p className="text-xs font-semibold tracking-widest text-white/30 uppercase mb-2">Progress</p>
              <p className="text-lg font-extrabold text-white">View Charts</p>
            </div>
          </Link>
          <Link href="/program" className="block">
            <div className="bg-white/[0.04] border border-white/[0.06] rounded-2xl p-5 hover:border-white/10 transition">
              <p className="text-xs font-semibold tracking-widest text-white/30 uppercase mb-2">Program</p>
              <p className="text-lg font-extrabold text-white">View Plan</p>
            </div>
          </Link>
        </div>

        {/* Admin */}
        {user.isAdmin && (
          <Link href="/admin" className="block">
            <div className="bg-white/[0.03] border border-white/[0.05] rounded-2xl p-4 flex items-center justify-between hover:border-white/10 transition">
              <div>
                <p className="text-xs font-semibold tracking-widest text-white/30 uppercase mb-0.5">Admin</p>
                <p className="text-sm font-bold text-white/70">Manage Programs & Media</p>
              </div>
              <span className="text-white/20 text-lg">→</span>
            </div>
          </Link>
        )}
      </div>
    </main>
  );
}
