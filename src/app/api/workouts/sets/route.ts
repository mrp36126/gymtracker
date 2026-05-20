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

const CARDIO_MUSCLE_GROUPS = new Set(['running', 'rowing', 'cycling']);

function isCardioMuscleGroup(muscleGroup: string) {
  return CARDIO_MUSCLE_GROUPS.has(muscleGroup.trim().toLowerCase());
}

export async function POST(req: NextRequest) {
  const { user, response } = await requireAuth();
  if (response) return response;

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

  const isCardio = isCardioMuscleGroup(exercise.muscleGroup);

  if (isCardio && (!body.durationSeconds || !body.distanceKm)) {
    return NextResponse.json({ error: 'Enter time and distance first' }, { status: 422 });
  }

  if (!isCardio && (body.weight === undefined || body.reps === undefined)) {
    return NextResponse.json({ error: 'Enter weight and reps first' }, { status: 422 });
  }

  const log = await prisma.workoutLog.create({
    data: {
      weight:     isCardio ? 0 : body.weight!,
      sets:       1,
      reps:       isCardio ? 1 : body.reps!,
      durationSeconds: isCardio ? body.durationSeconds : null,
      distanceKm: isCardio ? body.distanceKm : null,
      notes:      `Set ${body.setNumber}`,
      userId:     user!.id,
      exerciseId: body.exerciseId,
    },
  });

  return NextResponse.json({ data: log }, { status: 201 });
}
