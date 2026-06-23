import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { findActivePrimaryProgramForUser, findExerciseForUser } from '@/lib/program-scope';
import { resolveManagedTargetUser } from '@/lib/trainer-context';
import { getStartOfTodayInSAST } from '@/lib/timezone';
import { z } from 'zod';

const SetSchema = z.object({
  exerciseId: z.string().cuid(),
  exerciseName: z.string().min(1).max(120).optional(),
  setNumber:  z.number().int().positive(),
  weight:     z.number().nonnegative().optional(),
  reps:       z.number().int().positive().optional(),
  durationSeconds: z.number().int().positive().optional(),
  distanceKm: z.number().positive().optional(),
  targetUserId: z.string().cuid().optional(),
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

  let body: z.infer<typeof SetSchema>;
  try {
    body = SetSchema.parse(await req.json());
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.flatten() }, { status: 422 });
    }
    throw err;
  }

  const targetUser = await resolveManagedTargetUser(user!, body.targetUserId);
  if (!targetUser) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  if (targetUser.isTrainerUser) {
    return NextResponse.json({ error: 'Trainer users are read-only' }, { status: 403 });
  }

  const targetUserId = targetUser.id;
  const startOfToday = getStartOfTodayInSAST();

  const activePrimaryProgram = targetUser.isTrainerUser
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

  if (!user!.isAdmin) {
    if (!activePrimaryProgram) {
      return NextResponse.json({ error: 'Program assignment required' }, { status: 403 });
    }
  }

  let exercise = targetUser.isTrainerUser
    ? await prisma.exercise.findFirst({
        where: {
          id: body.exerciseId,
          programId: activePrimaryProgram?.id,
        },
      })
    : await findExerciseForUser(body.exerciseId, targetUserId);

  // If the client holds a stale exercise id (for example after session recreation),
  // recover by matching the current active program exercise by name.
  if (!exercise && activePrimaryProgram && body.exerciseName?.trim()) {
    exercise = await prisma.exercise.findFirst({
      where: {
        programId: activePrimaryProgram.id,
        name: body.exerciseName.trim(),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  if (!exercise) {
    return NextResponse.json({ error: 'Exercise not found. Please reload this workout session.' }, { status: 404 });
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
      userId:     targetUserId,
      exerciseId: exercise.id,
    },
  });

  return NextResponse.json({ data: log }, { status: 201 });
}
