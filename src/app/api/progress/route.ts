// src/app/api/progress/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { findActivePrimaryProgramForUser, findExerciseForUser } from '@/lib/program-scope';
import { canViewUserProgress } from '@/lib/rbac';

// GET /api/progress?exerciseId=X
export async function GET(req: NextRequest) {
  const { user, response } = await requireAuth();
  if (response) return response;

  if (!user!.isAdmin) {
    const activePrimaryProgram = await findActivePrimaryProgramForUser(user!.id);
    if (!activePrimaryProgram) {
      return NextResponse.json({ error: 'Program assignment required' }, { status: 403 });
    }
  }

  const { searchParams } = new URL(req.url);
  const exerciseId = searchParams.get('exerciseId');
  const targetUserId = searchParams.get('userId') ?? user!.id;

  const targetUser = targetUserId === user!.id
    ? user!
    : await prisma.user.findUnique({
        where: { id: targetUserId },
        select: { id: true, trainerId: true },
      });

  if (!canViewUserProgress(user!, targetUser)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  if (exerciseId) {
    const ok = await findExerciseForUser(exerciseId, targetUserId);
    if (!ok) {
      return NextResponse.json({ error: 'Exercise not found' }, { status: 404 });
    }
  }

  const where = { userId: targetUserId, ...(exerciseId ? { exerciseId } : {}) };

  const logs = await prisma.workoutLog.findMany({
    where,
    include: { exercise: { select: { name: true, muscleGroup: true } } },
    orderBy: { loggedAt: 'asc' },
  });

  const points = logs.map(log => ({
    date:      log.loggedAt.toISOString().split('T')[0],
    volume:    log.weight * log.sets * log.reps,
    weight:    log.weight,
    sets:      log.sets,
    reps:      log.reps,
    exercise:  log.exercise.name,
    muscleGroup: log.exercise.muscleGroup,
  }));

  return NextResponse.json({ data: points });
}
