import { getAuthUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getStartOfTodayInSAST } from '@/lib/timezone';
import { redirect } from 'next/navigation';
import type { Exercise } from '@/types';
import Link from 'next/link';
import { findActivePrimaryProgramForUser } from '@/lib/program-scope';
import WorkoutTimerButton from '@/components/timer/WorkoutTimerButton';
import { isAdmin, isTrainer } from '@/lib/rbac';
import { resolveManagedTargetUser } from '@/lib/trainer-context';
import WorkoutSessionManager from '@/components/workout/WorkoutSessionManager';

function parseUserIdsQuery(userIds?: string) {
  return Array.from(new Set(
    (userIds ?? '')
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean),
  ));
}

export default async function WorkoutDayPage({
  params,
  searchParams,
}: {
  params: Promise<{ day: string }>;
  searchParams?: Promise<{ userId?: string; userIds?: string }>;
}) {
  const user = await getAuthUser();
  if (!user) redirect('/login');

  const { day: rawDay } = await params;
  const query = searchParams ? await searchParams : {};
  const day = rawDay.charAt(0).toUpperCase() + rawDay.slice(1);
  const requestedUserIds = parseUserIdsQuery(query.userIds);

  const toggleTargets = (isTrainer(user) || isAdmin(user)) && requestedUserIds.length > 0
    ? (await Promise.all(requestedUserIds.map((id) => resolveManagedTargetUser(user, id))))
      .filter((target): target is NonNullable<typeof target> => Boolean(target && target.isTrainerUser))
    : [];

  const defaultTargetUserId = toggleTargets[0]?.id;
  const requestedSingleUserId = query.userId && toggleTargets.some((target) => target.id === query.userId)
    ? query.userId
    : query.userId ?? defaultTargetUserId;

  const targetUser = await resolveManagedTargetUser(user, requestedSingleUserId);

  if (!targetUser) {
    redirect('/welcome');
  }

  const targetUserId = targetUser.id;
  const targetUserName = targetUserId === user.id ? user.name : targetUser.name ?? 'Selected user';
  const viewerCanCaptureForTarget = isTrainer(user) || isAdmin(user) || targetUserId === user.id;

  const startOfToday = getStartOfTodayInSAST();

  const program = targetUser.isTrainerUser
    ? await prisma.program.findFirst({
        where: {
          userId: targetUserId,
          isActive: true,
          programType: 'primary',
          name: { startsWith: 'Trainer Session · ' },
          createdAt: { gte: startOfToday },
        },
        orderBy: { createdAt: 'desc' },
      })
    : await findActivePrimaryProgramForUser(targetUserId);

  if (!program) {
    if (!isAdmin(user) && !isTrainer(user)) redirect('/welcome');
    const userIdsQuery = toggleTargets.map((target) => target.id).join(',');
    return (
      <main className="min-h-screen bg-[#0A0A0F] flex items-center justify-center p-6">
        <div className="text-center">
          <p className="text-white/40">No active session found.</p>
          {isTrainer(user) && targetUserId !== user.id && (
            <Link href={`/trainer/session?userIds=${encodeURIComponent(userIdsQuery || targetUserId)}`} className="text-indigo-400 text-sm mt-2 inline-block">Load exercises for this session</Link>
          )}
          <Link href="/welcome" className="text-indigo-400 text-sm mt-2 inline-block">← Home</Link>
        </div>
      </main>
    );
  }

  const exercises = await prisma.exercise.findMany({
    where: { programId: program.id, day },
    orderBy: { order: 'asc' },
  });

  const exercisesWithLogs: Exercise[] = await Promise.all(
    exercises.map(async ex => {
      const lastLog = await prisma.workoutLog.findFirst({
        where: { exerciseId: ex.id, userId: targetUserId },
        orderBy: { loggedAt: 'desc' },
      });
      return { ...ex, lastLog: lastLog ?? null } as Exercise;
    })
  );

  if (exercisesWithLogs.length === 0) {
    return (
      <main className="min-h-screen bg-[#0A0A0F] p-6">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between mb-8">
            <Link href="/welcome" className="text-white/40 hover:text-white/70 transition text-sm">← Home</Link>
          </div>
          <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-10 text-center">
            <p className="text-3xl mb-3">🎉</p>
            <p className="text-white font-bold text-lg">Rest Day</p>
            <p className="text-white/40 text-sm mt-1">No exercises scheduled for {day}.</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0A0A0F] pb-10">

      {/* Header */}
      <div className="bg-white/[0.03] border-b border-white/[0.06] px-6 py-4 flex items-center justify-between sticky top-0 backdrop-blur-xl z-10">
        <Link href="/welcome" className="text-white/40 hover:text-white/70 transition text-sm">← Home</Link>
        <div className="text-center">
          <p className="text-xs font-semibold text-white/30 uppercase tracking-widest">{program.name}</p>
          <p className="text-sm font-bold text-white">{targetUserId === user.id ? `${day} Workout` : `${targetUserName} · ${day}`}</p>
        </div>
        <div className="flex items-center justify-end gap-2">
          <WorkoutTimerButton label={targetUserId === user.id ? `${day} Workout` : `${targetUserName} ${day} Workout`} />
          <div className="hidden text-xs text-white/30 sm:block">{exercisesWithLogs.length} exercises</div>
        </div>
      </div>

      {toggleTargets.length > 1 && (
        <div className="mx-auto w-full max-w-lg px-4 pt-4">
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-3">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-white/35">Trainee Toggle</p>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {toggleTargets.map((target) => {
                const isActive = target.id === targetUserId;
                const userIdsQuery = toggleTargets.map((entry) => entry.id).join(',');
                const displayName = target.name ?? 'Trainer User';
                return (
                  <Link
                    key={target.id}
                    href={`/workout/${rawDay}?userId=${target.id}&userIds=${encodeURIComponent(userIdsQuery)}`}
                    className={`shrink-0 rounded-xl border px-3 py-2 text-xs font-bold transition ${
                      isActive
                        ? 'border-indigo-400/60 bg-indigo-500/25 text-white'
                        : 'border-white/[0.08] bg-white/[0.05] text-white/60 hover:border-indigo-400/30 hover:text-white/80'
                    }`}
                  >
                    {displayName}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <WorkoutSessionManager
        day={day}
        programId={program.id}
        program={program}
        targetUserId={targetUserId}
        targetUserName={targetUserName}
        user={user}
        initialExercises={exercisesWithLogs}
        readOnly={Boolean(targetUser.isTrainerUser && !viewerCanCaptureForTarget)}
        isTrainingForSomeone={targetUserId !== user.id}
      />
    </main>
  );
}
