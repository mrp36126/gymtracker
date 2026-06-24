// src/app/api/workouts/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getTodayName } from '@/lib/day-resolver';
import { findActivePrimaryProgramForUser, findExerciseForUser } from '@/lib/program-scope';
import { buildWorkoutLogOwnerWhere } from '@/lib/workout-log-identity';
import { z } from 'zod';

// GET /api/workouts?programId=X&day=Monday
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
        where: buildWorkoutLogOwnerWhere(user!, { exerciseId: ex.id }),
        orderBy: { loggedAt: 'desc' },
      });
      return { ...ex, lastLog };
    })
  );

  return NextResponse.json({ data: { day, exercises: exercisesWithLog } });
}

const LogSchema = z.object({
  exerciseId: z.string().cuid(),
  weight:     z.number().nonnegative().optional(),
  sets:       z.number().int().positive().max(20),
  reps:       z.number().int().positive().max(100).optional(),
  durationSeconds: z.number().int().positive().optional(),
  distanceKm: z.number().positive().optional(),
  notes:      z.string().max(255).optional(),
});

type LogMode = 'timeDistance' | 'timeOnly' | 'weightDistance' | 'repsOnly' | 'strength';

function normalize(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
}

function getLogMode(muscleGroup: string, exerciseName: string): LogMode {
  const normalized = normalize(muscleGroup);
  const normalizedName = normalize(exerciseName);

  if (normalizedName === 'plank' || normalizedName === 'planks') {
    return 'timeOnly';
  }

  if (['running', 'rowing', 'cycling', 'skierg'].includes(normalized)
    || ['running', 'rowing', 'cycling', 'skierg'].includes(normalizedName)) {
    return 'timeDistance';
  }

  if (['sledpush', 'sledpull', 'farmers'].includes(normalized)) {
    return 'weightDistance';
  }

  if (normalized === 'burpee') {
    return 'repsOnly';
  }

  return 'strength';
}

// POST /api/workouts – log a set
export async function POST(req: NextRequest) {
  const { user, response } = await requireAuth();
  if (response) return response;

  if (user!.isTrainerUser) {
    return NextResponse.json({ error: 'Trainer users are read-only' }, { status: 403 });
  }

  if (!user!.isAdmin) {
    const activePrimaryProgram = await findActivePrimaryProgramForUser(user!.id);
    if (!activePrimaryProgram) {
      return NextResponse.json({ error: 'Program assignment required' }, { status: 403 });
    }
  }

  let body: z.infer<typeof LogSchema>;
  try {
    body = LogSchema.parse(await req.json());
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.flatten() }, { status: 422 });
    }
    throw err;
  }

  const exercise = await findExerciseForUser(body.exerciseId, user!.id);
  if (!exercise) {
    return NextResponse.json({ error: 'Exercise not found' }, { status: 404 });
  }

  const logMode = getLogMode(exercise.muscleGroup, exercise.name);

  if (logMode === 'timeDistance' && (!body.durationSeconds || !body.distanceKm)) {
    return NextResponse.json({ error: 'Enter time and distance first' }, { status: 422 });
  }

  if (logMode === 'timeOnly' && !body.durationSeconds) {
    return NextResponse.json({ error: 'Enter time first' }, { status: 422 });
  }

  if (logMode === 'weightDistance' && (body.weight === undefined || !body.distanceKm)) {
    return NextResponse.json({ error: 'Enter weight and distance first' }, { status: 422 });
  }

  if (logMode === 'repsOnly' && body.reps === undefined) {
    return NextResponse.json({ error: 'Enter reps first' }, { status: 422 });
  }

  if (logMode === 'strength' && (body.weight === undefined || body.reps === undefined)) {
    return NextResponse.json({ error: 'Enter weight and reps first' }, { status: 422 });
  }

  const log = await prisma.workoutLog.create({
    data: {
      exerciseId: body.exerciseId,
      weight: logMode === 'timeDistance' || logMode === 'timeOnly' || logMode === 'repsOnly' ? 0 : body.weight!,
      sets: body.sets,
      reps: logMode === 'timeDistance' || logMode === 'timeOnly' || logMode === 'weightDistance' ? 1 : body.reps!,
      durationSeconds: logMode === 'timeDistance' || logMode === 'timeOnly' ? body.durationSeconds : null,
      distanceKm: logMode === 'timeDistance' || logMode === 'weightDistance' ? body.distanceKm : null,
      notes: body.notes,
      userId: user!.id,
    },
  });

  return NextResponse.json({ data: log }, { status: 201 });
}
