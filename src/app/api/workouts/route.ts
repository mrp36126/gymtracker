// src/app/api/workouts/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getTodayName } from '@/lib/day-resolver';
import { findExerciseForUser } from '@/lib/program-scope';
import { z } from 'zod';

// GET /api/workouts?programId=X&day=Monday
export async function GET(req: NextRequest) {
  const { user, response } = await requireAuth();
  if (response) return response;

  const { searchParams } = new URL(req.url);
  const programId = searchParams.get('programId');
  const day = searchParams.get('day') ?? getTodayName();

  if (!programId) {
    return NextResponse.json({ error: 'programId is required' }, { status: 400 });
  }

  const owned = await prisma.program.findFirst({
    where: { id: programId, userId: user!.id },
  });
  if (!owned) {
    return NextResponse.json({ error: 'Program not found' }, { status: 404 });
  }

  const exercises = await prisma.exercise.findMany({
    where: { programId, day },
    orderBy: { order: 'asc' },
  });

  // Attach most recent log per exercise
  const exercisesWithLog = await Promise.all(
    exercises.map(async (ex) => {
      const lastLog = await prisma.workoutLog.findFirst({
        where: { exerciseId: ex.id, userId: user!.id },
        orderBy: { loggedAt: 'desc' },
      });
      return { ...ex, lastLog };
    })
  );

  return NextResponse.json({ data: { day, exercises: exercisesWithLog } });
}

const LogSchema = z.object({
  exerciseId: z.string().cuid(),
  weight:     z.number().nonnegative(),
  sets:       z.number().int().positive().max(20),
  reps:       z.number().int().positive().max(100),
  notes:      z.string().max(255).optional(),
});

// POST /api/workouts – log a set
export async function POST(req: NextRequest) {
  const { user, response } = await requireAuth();
  if (response) return response;

  let body: z.infer<typeof LogSchema>;
  try {
    body = LogSchema.parse(await req.json());
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.flatten() }, { status: 422 });
    }
    throw err;
  }

  const exerciseOk = await findExerciseForUser(body.exerciseId, user!.id);
  if (!exerciseOk) {
    return NextResponse.json({ error: 'Exercise not found' }, { status: 404 });
  }

  const log = await prisma.workoutLog.create({
    data: {
      ...body,
      userId: user!.id,
    },
  });

  return NextResponse.json({ data: log }, { status: 201 });
}
