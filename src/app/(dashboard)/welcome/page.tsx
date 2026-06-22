import { getAuthUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getTodayName } from '@/lib/day-resolver';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { canUseFlexibleSession, canUseTrainerCustomWorkout, isIndividualUser } from '@/lib/rbac';
import TrainerHomeOptions from '@/components/trainer/TrainerHomeOptions';
import { getStartOfTodayInSAST, getDateXDaysAgoInSAST } from '@/lib/timezone';

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

  const initials = user.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
  const hour = (await import('@/lib/timezone')).getNowInSAST().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  if (user.isTrainer && !user.isAdmin) {
    const assignedUsers = await prisma.user.findMany({
      where: { isTrainerUser: true, trainerId: user.id },
      select: { id: true, name: true, email: true },
      orderBy: [{ name: 'asc' }, { email: 'asc' }],
    });

    return (
      <main className="min-h-screen bg-[#0A0A0F] pb-24">
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

        <div className="px-4 pt-7 pb-4 w-full max-w-6xl mx-auto">
          <div className="mb-7">
            <p className="text-xs font-semibold tracking-widest text-indigo-400 uppercase mb-1">{greeting}</p>
            <h1 className="text-3xl font-extrabold tracking-tight text-white">Trainer Home</h1>
            <p className="text-sm text-white/40 mt-1">Choose how you want to train, coach, and review your assigned users today.</p>
          </div>

          <TrainerHomeOptions assignedUsers={assignedUsers} todayName={todayName} />
        </div>
      </main>
    );
  }

  let activeProgram = null;
  let supplementaryPrograms: any[] = [];
  let todayExerciseCount = 0;
  let lastMonthLogCount = 0;

  try {
    if (user.isTrainerUser) {
      const startOfToday = getStartOfTodayInSAST();
      activeProgram = await prisma.program.findFirst({
        where: {
          isActive: true,
          programType: 'primary',
          userId: user.id,
          name: { startsWith: 'Trainer Session · ' },
          createdAt: { gte: startOfToday },
        },
        orderBy: { createdAt: 'desc' },
      });
    } else {
      activeProgram = await prisma.program.findFirst({
        where: { isActive: true, programType: 'primary', userId: user.id },
      });
    }

    if (activeProgram) {
      todayExerciseCount = await prisma.exercise.count({
        where: { programId: activeProgram.id, day: todayName },
      });
    }

    if (user.isTrainerUser) {
      const thirtyDaysAgo = getDateXDaysAgoInSAST(30);
      lastMonthLogCount = await prisma.workoutLog.count({
        where: {
          userId: user.id,
          loggedAt: { gte: thirtyDaysAgo },
        },
      });
    }

    supplementaryPrograms = await prisma.program.findMany({
      where: { isActive: true, programType: 'supplementary', userId: user.id },
      orderBy: { name: 'asc' },
    });
  } catch {
    // ignore transient data fetch issues and render the fallback cards
  }

  const hyroxProgram = supplementaryPrograms.find((program: any) =>
    program.name.toLowerCase().includes('hyrox')
  );
  const otherSupplementaryPrograms = supplementaryPrograms.filter((program: any) =>
    program.id !== hyroxProgram?.id
  );

  return (
    <main className="min-h-screen bg-[#0A0A0F] pb-24">
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
        <div className="mb-7">
          <p className="text-xs font-semibold tracking-widest text-indigo-400 uppercase mb-1">{greeting}</p>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">Hello, {user.name}</h1>
          <p className="text-sm text-white/40 mt-1">
            {activeProgram ? activeProgram.name : 'No active program'}
            {todayExerciseCount > 0 ? ` - ${todayExerciseCount} exercises today` : ''}
          </p>
        </div>

        <div className="mb-6">
          <p className="text-xs font-semibold tracking-widest text-white/30 uppercase mb-3">Choose Today&apos;s Workout</p>
          <div className="grid gap-3">
            {(user.isAdmin || isIndividualUser(user)) && (activeProgram ? (
              <Link href={'/workout/' + todayName.toLowerCase()} className="block">
                <div className="relative bg-indigo-600 rounded-2xl p-6 overflow-hidden hover:bg-indigo-500 transition">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-8 translate-x-8"></div>
                  <div className="absolute bottom-0 right-16 w-20 h-20 bg-white/5 rounded-full translate-y-6"></div>
                  <p className="text-xs font-semibold tracking-widest text-white/60 uppercase mb-2">Existing Active Program</p>
                  <p className="text-2xl font-extrabold text-white tracking-tight">{todayName} Session</p>
                  <p className="text-sm text-white/60 mt-1">{activeProgram.name}</p>
                  <div className="absolute right-6 top-1/2 -translate-y-1/2 text-white/40 text-2xl">-&gt;</div>
                </div>
              </Link>
            ) : (
              <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-6">
                <p className="text-xs font-semibold tracking-widest text-white/30 uppercase mb-2">Existing Active Program</p>
                <p className="text-lg font-extrabold text-white">No active program assigned</p>
                {user.isAdmin ? (
                  <Link href="/admin" className="text-indigo-400 text-sm mt-2 inline-block hover:text-indigo-300 transition">
                    Go to Admin to activate one
                  </Link>
                ) : (
                  <p className="text-sm text-white/45 mt-2">Your administrator can assign a program when it is ready.</p>
                )}
              </div>
            ))}

            {!user.isTrainerUser && (
              <Link href={hyroxProgram ? '/supplementary/' + hyroxProgram.id : '/hyrox'} className="block">
                <div className="relative bg-white/[0.04] border border-purple-500/20 rounded-2xl p-5 hover:border-purple-500/40 hover:bg-white/[0.06] transition">
                  <p className="text-xs font-semibold tracking-widest text-purple-300/60 uppercase mb-2">Hyrox</p>
                    <p className="text-xl font-extrabold text-white tracking-tight">
                      {hyroxProgram ? hyroxProgram.name : 'Hyrox'}
                    </p>
                    <p className="text-sm text-white/45 mt-1">
                      {hyroxProgram?.description || 'Conditioning-focused workout option.'}
                    </p>
                  <div className="absolute right-5 top-1/2 -translate-y-1/2 text-purple-300/50 text-xl">-&gt;</div>
                </div>
              </Link>
            )}

            {canUseFlexibleSession(user) && (
              <Link href="/custom-workout" className="block">
                <div className="relative bg-white/[0.04] border border-emerald-500/20 rounded-2xl p-5 hover:border-emerald-500/40 hover:bg-white/[0.06] transition">
                  <p className="text-xs font-semibold tracking-widest text-emerald-300/60 uppercase mb-2">Flexible Session</p>
                  <p className="text-xl font-extrabold text-white tracking-tight">I Want To Do My Own Program Today</p>
                  <p className="text-sm text-white/45 mt-1">Build a workout one exercise at a time from the exercise catalog.</p>
                  <div className="absolute right-5 top-1/2 -translate-y-1/2 text-emerald-300/50 text-xl">-&gt;</div>
                </div>
              </Link>
            )}
          </div>
        </div>

        {!activeProgram && !user.isAdmin && (
          <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-6 mb-4">
            <p className="text-lg font-bold text-white mb-4">
              Welcome to the best gym app, and thank you for joining our fitness community!
            </p>
            <div className="space-y-4 text-sm leading-6 text-white/60">
              <p>
                Your account has been successfully created and you are all set to begin your journey.
                At the moment, your workout program has not yet been assigned by the administrator.
              </p>
              <p>
                You can still use the custom workout option today while your assigned program is being prepared.
              </p>
            </div>
          </div>
        )}

        {user.isAdmin && otherSupplementaryPrograms.length > 0 && (
          <div className="mb-4">
            <p className="text-xs font-semibold tracking-widest text-white/30 uppercase mb-3">Additional Programs</p>
            <div className="space-y-3">
              {otherSupplementaryPrograms.map((prog: any) => (
                <Link key={prog.id} href={'/supplementary/' + prog.id} className="block">
                  <div className="bg-white/[0.04] border border-indigo-500/20 rounded-2xl p-5 flex items-center justify-between hover:border-indigo-500/40 transition">
                    <div>
                      <p className="font-bold text-white text-sm">{prog.name}</p>
                      {prog.description && (
                        <p className="text-xs text-white/40 mt-0.5">{prog.description}</p>
                      )}
                    </div>
                    <span className="text-indigo-400 font-bold">-&gt;</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {user.isAdmin ? (
          <>
            <div className="grid grid-cols-3 gap-3 mb-4">
              <Link href="/progress" className="block">
                <div className="bg-white/[0.04] border border-white/[0.06] rounded-2xl p-5 hover:border-white/10 transition">
                  <p className="text-xs font-semibold tracking-widest text-white/30 uppercase mb-2">Progress</p>
                  <p className="text-lg font-extrabold text-white">Charts</p>
                </div>
              </Link>
              <Link href="/program" className="block">
                <div className="bg-white/[0.04] border border-white/[0.06] rounded-2xl p-5 hover:border-white/10 transition">
                  <p className="text-xs font-semibold tracking-widest text-white/30 uppercase mb-2">Program</p>
                  <p className="text-lg font-extrabold text-white">Plan</p>
                </div>
              </Link>
              <Link href="/leaderboard" className="block">
                <div className="bg-white/[0.04] border border-indigo-500/20 rounded-2xl p-5 hover:border-indigo-500/40 transition">
                  <p className="text-xs font-semibold tracking-widest text-white/30 uppercase mb-2">Leaderboard</p>
                  <p className="text-lg font-extrabold text-white">Top Lifts</p>
                </div>
              </Link>
            </div>

            <Link href="/admin" className="block">
              <div className="bg-white/[0.03] border border-white/[0.05] rounded-2xl p-4 flex items-center justify-between hover:border-white/10 transition">
                <div>
                  <p className="text-xs font-semibold tracking-widest text-white/30 uppercase mb-0.5">Admin</p>
                  <p className="text-sm font-bold text-white/70">Manage Programs & Media</p>
                </div>
                <span className="text-white/20 text-lg">-&gt;</span>
              </div>
            </Link>
          </>
        ) : user.isTrainer ? (
          <div className="grid grid-cols-2 gap-3 mb-4">
            <Link href="/welcome" className="block">
              <div className="bg-white/[0.04] border border-white/[0.06] rounded-2xl p-5 hover:border-white/10 transition">
                <p className="text-xs font-semibold tracking-widest text-white/30 uppercase mb-2">Dashboard</p>
                <p className="text-lg font-extrabold text-white">Home</p>
              </div>
            </Link>
            <Link href="/admin" className="block">
              <div className="bg-white/[0.04] border border-white/[0.06] rounded-2xl p-5 hover:border-white/10 transition">
                <p className="text-xs font-semibold tracking-widest text-white/30 uppercase mb-2">Assigned Users</p>
                <p className="text-lg font-extrabold text-white">Manage</p>
              </div>
            </Link>
            <Link href="/admin" className="block">
              <div className="bg-white/[0.04] border border-white/[0.06] rounded-2xl p-5 hover:border-white/10 transition">
                <p className="text-xs font-semibold tracking-widest text-white/30 uppercase mb-2">Create Program</p>
                <p className="text-lg font-extrabold text-white">Exercise Pool</p>
              </div>
            </Link>
            <Link href="/program" className="block">
              <div className="bg-white/[0.04] border border-white/[0.06] rounded-2xl p-5 hover:border-white/10 transition">
                <p className="text-xs font-semibold tracking-widest text-white/30 uppercase mb-2">Supplementary Programs</p>
                <p className="text-lg font-extrabold text-white">View</p>
              </div>
            </Link>
            <Link href="/program" className="block">
              <div className="bg-white/[0.04] border border-white/[0.06] rounded-2xl p-5 hover:border-white/10 transition">
                <p className="text-xs font-semibold tracking-widest text-white/30 uppercase mb-2">Exercise Pool</p>
                <p className="text-lg font-extrabold text-white">Programs</p>
              </div>
            </Link>
            <Link href="/progress" className="block">
              <div className="bg-white/[0.04] border border-white/[0.06] rounded-2xl p-5 hover:border-white/10 transition">
                <p className="text-xs font-semibold tracking-widest text-white/30 uppercase mb-2">Progress Tracking</p>
                <p className="text-lg font-extrabold text-white">Charts</p>
              </div>
            </Link>
            {canUseTrainerCustomWorkout(user) && (
              <Link href="/custom-workout" className="block">
                <div className="bg-white/[0.04] border border-white/[0.06] rounded-2xl p-5 hover:border-white/10 transition">
                  <p className="text-xs font-semibold tracking-widest text-white/30 uppercase mb-2">Flexible Session</p>
                  <p className="text-lg font-extrabold text-white">My Own Workout</p>
                </div>
              </Link>
            )}
            <Link href="/leaderboard" className="block">
              <div className="bg-white/[0.04] border border-indigo-500/20 rounded-2xl p-5 hover:border-indigo-500/40 transition">
                <p className="text-xs font-semibold tracking-widest text-white/30 uppercase mb-2">Leaderboard</p>
                <p className="text-lg font-extrabold text-white">Top Lifts</p>
              </div>
            </Link>
          </div>
        ) : user.isTrainerUser ? (
          <div className="grid grid-cols-2 gap-3 mb-4">
            <Link href={activeProgram ? '/workout/' + todayName.toLowerCase() : '/welcome'} className="block">
              <div className="bg-white/[0.04] border border-white/[0.06] rounded-2xl p-5 hover:border-white/10 transition">
                <p className="text-xs font-semibold tracking-widest text-white/30 uppercase mb-2">Today&apos;s Workout</p>
                <p className="text-lg font-extrabold text-white">Today&apos;s Workout</p>
                <p className="text-xs text-white/40 mt-1">Trainer-selected exercises with prescribed sets and reps.</p>
              </div>
            </Link>
            <Link href="/last-month-exercises" className="block">
              <div className="bg-white/[0.04] border border-white/[0.06] rounded-2xl p-5 hover:border-white/10 transition">
                <p className="text-xs font-semibold tracking-widest text-white/30 uppercase mb-2">My Last Month&apos;s Exercises</p>
                <p className="text-lg font-extrabold text-white">Last 30 Days</p>
                <p className="text-xs text-white/40 mt-1">{lastMonthLogCount} logged sets captured from your trainer plan.</p>
              </div>
            </Link>
            <Link href="/progress" className="block">
              <div className="bg-white/[0.04] border border-white/[0.06] rounded-2xl p-5 hover:border-white/10 transition">
                <p className="text-xs font-semibold tracking-widest text-white/30 uppercase mb-2">Progress Charts</p>
                <p className="text-lg font-extrabold text-white">Progress Charts</p>
              </div>
            </Link>
            <Link href="/leaderboard" className="block">
              <div className="bg-white/[0.04] border border-indigo-500/20 rounded-2xl p-5 hover:border-indigo-500/40 transition">
                <p className="text-xs font-semibold tracking-widest text-white/30 uppercase mb-2">Overall Leaderboard</p>
                <p className="text-lg font-extrabold text-white">All Users</p>
              </div>
            </Link>
          </div>
        ) : (
          <div className="grid gap-3 mb-4 grid-cols-2">
            <Link href="/progress" className="block">
              <div className="bg-white/[0.04] border border-white/[0.06] rounded-2xl p-5 hover:border-white/10 transition">
                <p className="text-xs font-semibold tracking-widest text-white/30 uppercase mb-2">Progress</p>
                <p className="text-lg font-extrabold text-white">Charts</p>
              </div>
            </Link>
            <Link href="/leaderboard" className="block">
              <div className="bg-white/[0.04] border border-indigo-500/20 rounded-2xl p-5 hover:border-indigo-500/40 transition">
                <p className="text-xs font-semibold tracking-widest text-white/30 uppercase mb-2">Leaderboard</p>
                <p className="text-lg font-extrabold text-white">Top Lifts</p>
              </div>
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
