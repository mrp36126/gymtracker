// src/app/api/progress/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/progress?exerciseId=X
export async function GET(req: NextRequest) {
  const { user, response } = await requireAuth();
  if (response) return response;

  const { searchParams } = new URL(req.url);
  const exerciseId = searchParams.get('exerciseId');

  const where = { userId: user!.id, ...(exerciseId ? { exerciseId } : {}) };

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
