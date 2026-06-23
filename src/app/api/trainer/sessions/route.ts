import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth';
import { isAdmin, isTrainer } from '@/lib/rbac';
import { resolveManagedTargetUser } from '@/lib/trainer-context';
import { loadExerciseCatalog } from '@/lib/exercise-catalog';
import { prisma } from '@/lib/prisma';
import { getTodayName } from '@/lib/day-resolver';
import { getNowInSAST, getStartOfTodayInSAST } from '@/lib/timezone';

const SelectedSessionExerciseSchema = z.object({
  exerciseId: z.string().min(1),
  sets: z.coerce.number().int().positive().max(20),
  reps: z.string().regex(/^\d+(-\d+)?$/, 'Reps must be e.g. 10 or 8-12'),
  notes: z.string().max(1000).optional().default(''),
});

const TrainerSessionSchema = z.object({
  targetUserId: z.string().cuid().optional(),
  targetUserIds: z.array(z.string().cuid()).min(1).optional(),
  exercises: z.array(SelectedSessionExerciseSchema).min(1, 'Choose at least one exercise'),
}).refine((payload) => Boolean(payload.targetUserId) || Boolean(payload.targetUserIds && payload.targetUserIds.length > 0), {
  message: 'Provide at least one trainer user',
  path: ['targetUserIds'],
});

function sessionDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

export async function POST(req: NextRequest) {
  const { user, response } = await requireAuth();
  if (response) return response;

  if (!isTrainer(user!) && !isAdmin(user!)) {
    return NextResponse.json({ error: 'Trainer access required' }, { status: 403 });
  }

  let parsedBody: z.infer<typeof TrainerSessionSchema>;
  try {
    parsedBody = TrainerSessionSchema.parse(await req.json());
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues.map((issue) => issue.message).join('\n') }, { status: 422 });
    }
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const requestedTargetIds = parsedBody.targetUserIds && parsedBody.targetUserIds.length > 0
    ? Array.from(new Set(parsedBody.targetUserIds))
    : parsedBody.targetUserId
      ? [parsedBody.targetUserId]
      : [];

  const resolvedTargets = await Promise.all(
    requestedTargetIds.map((targetId) => resolveManagedTargetUser(user!, targetId)),
  );

  const targetUsers = resolvedTargets.filter((target): target is NonNullable<typeof target> => Boolean(target && target.isTrainerUser));
  if (targetUsers.length !== requestedTargetIds.length || targetUsers.length === 0) {
    return NextResponse.json({ error: 'One or more trainer users were not found or are not assigned to you' }, { status: 403 });
  }

  let catalog;
  try {
    catalog = await loadExerciseCatalog();
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Unable to load exercise catalog' }, { status: 500 });
  }

  const catalogById = new Map(catalog.map((exercise) => [exercise.id, exercise]));
  const unknownExercises = parsedBody.exercises
    .filter((exercise) => !catalogById.has(exercise.exerciseId))
    .map((exercise) => exercise.exerciseId);

  if (unknownExercises.length > 0) {
    return NextResponse.json({ error: `Unknown exercise id(s): ${unknownExercises.join(', ')}` }, { status: 422 });
  }

  const now = getNowInSAST();
  const startOfToday = getStartOfTodayInSAST();
  const todayName = getTodayName();
  const name = `Trainer Session · ${sessionDateKey(now)}`;

  const sessionPrograms = await prisma.$transaction(async (tx) => {
    const createdPrograms: { id: string; userId: string; exerciseCount: number }[] = [];

    for (const targetUser of targetUsers) {
      await tx.program.updateMany({
        where: {
          userId: targetUser.id,
          programType: 'primary',
          isActive: true,
        },
        data: { isActive: false },
      });

      await tx.program.deleteMany({
        where: {
          userId: targetUser.id,
          programType: 'primary',
          name: { startsWith: 'Trainer Session · ' },
          createdAt: { gte: startOfToday },
        },
      });

      const created = await tx.program.create({
        data: {
          name,
          description: `Loaded by trainer for ${todayName}`,
          programType: 'primary',
          isActive: true,
          userId: targetUser.id,
          exercises: {
            create: parsedBody.exercises.map((selectedExercise, index) => {
              const catalogExercise = catalogById.get(selectedExercise.exerciseId)!;
              return {
                name: catalogExercise.exerciseName,
                muscleGroup: catalogExercise.category,
                day: todayName,
                order: index + 1,
                defaultSets: selectedExercise.sets,
                defaultReps: selectedExercise.reps,
                notes: selectedExercise.notes || catalogExercise.instructions,
                mediaUrl: catalogExercise.imageUrl || null,
                detailImageUrl: catalogExercise.detailImageUrl || null,
              };
            }),
          },
        },
        include: { _count: { select: { exercises: true } } },
      });

      createdPrograms.push({
        id: created.id,
        userId: targetUser.id,
        exerciseCount: created._count.exercises,
      });
    }

    return createdPrograms;
  });

  return NextResponse.json({
    data: {
      day: todayName,
      targets: sessionPrograms,
      exercisesPerTarget: sessionPrograms[0]?.exerciseCount ?? 0,
    },
  }, { status: 201 });
}