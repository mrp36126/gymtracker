import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { findActivePrimaryProgramForUser, findExerciseForUser } from '@/lib/program-scope';
import { z } from 'zod';

const SetSchema = z.object({
  exerciseId: z.string().cuid(),
  setNumber:  z.number().int().positive(),
  weight:     z.number().nonnegative().optional(),
  reps:       z.number().int().positive().optional(),
  durationSeconds: z.number().int().positive().optional(),
  distanceKm: z.number().positive().optional(),
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

  let body: z.infer<typeof SetSchema>;
  try {
    body = SetSchema.parse(await req.json());
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
      weight:     logMode === 'timeDistance' || logMode === 'timeOnly' || logMode === 'repsOnly' ? 0 : body.weight!,
      sets:       1,
      reps:       logMode === 'timeDistance' || logMode === 'timeOnly' || logMode === 'weightDistance' ? 1 : body.reps!,
      durationSeconds: logMode === 'timeDistance' || logMode === 'timeOnly' ? body.durationSeconds : null,
      distanceKm: logMode === 'timeDistance' || logMode === 'weightDistance' ? body.distanceKm : null,
      notes:      `Set ${body.setNumber}`,
      userId:     user!.id,
      exerciseId: body.exerciseId,
    },
  });

  return NextResponse.json({ data: log }, { status: 201 });
}
