import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { canManageProgram, canViewProgram, findActivePrimaryProgramForUser } from '@/lib/program-scope';
import { isAdmin, isTrainer } from '@/lib/rbac';
import { loadExerciseCatalog } from '@/lib/exercise-catalog';
import { z } from 'zod';

const DaySchema = z.enum(['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']);

const PatchProgramSchema = z.object({
  name: z.string().min(1).optional(),
  addExercise: z.object({
    exerciseId: z.string().min(1),
    day: DaySchema,
    sets: z.coerce.number().int().positive().max(20),
    reps: z.string().regex(/^\d+(-\d+)?$/, 'Reps must be e.g. 10 or 8-12'),
    notes: z.string().max(1000).optional().default(''),
  }).optional(),
  removeExerciseId: z.string().min(1).optional(),
  reorderExercises: z.object({
    day: DaySchema,
    exerciseIds: z.array(z.string().min(1)).min(1),
  }).optional(),
}).refine((value) => value.name || value.addExercise || value.removeExerciseId || value.reorderExercises, {
  message: 'Provide a program name, exercise to add, exercise to remove, or exercise order',
});

// GET single program
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, response } = await requireAuth();
  if (response) return response;
  if (!isAdmin(user!) && !isTrainer(user!)) {
    const activePrimaryProgram = await findActivePrimaryProgramForUser(user!.id);
    if (!activePrimaryProgram) {
      return NextResponse.json({ error: 'Program assignment required' }, { status: 403 });
    }
  }
  const { id } = await params;

  const program = await prisma.program.findFirst({
    where: { id },
    include: {
      user: { select: { id: true, trainerId: true, isAdmin: true, isTrainer: true, isTrainerUser: true } },
      exercises: { orderBy: [{ day: 'asc' }, { order: 'asc' }] },
    },
  });

  if (!program) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (!canViewProgram(user!, program.user)) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ data: program });
}

// PATCH — rename program
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, response } = await requireAuth();
  if (response) return response;
  if (user!.isTrainerUser) return NextResponse.json({ error: 'Program management required' }, { status: 403 });

  const { id } = await params;
  let input;
  try {
    input = PatchProgramSchema.parse(await req.json());
  } catch (err: any) {
    const message = err?.issues?.map((issue: z.ZodIssue) => issue.message).join('\n') || 'Invalid request';
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const existing = await prisma.program.findFirst({
    where: { id },
    include: { user: { select: { id: true, trainerId: true, isAdmin: true, isTrainer: true, isTrainerUser: true } } },
  });
  if (!existing) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const canManage = canManageProgram(user!, existing.user);
  const isExerciseMutation = Boolean(input.addExercise || input.removeExerciseId || input.reorderExercises);
  const canSelfManageActivePrimaryExercises = (
    existing.user.id === user!.id
    && existing.isActive
    && existing.programType === 'primary'
    && !user!.isTrainerUser
    && isExerciseMutation
  );

  if (!canManage && !canSelfManageActivePrimaryExercises) {
    if (!isAdmin(user!) && !isTrainer(user!)) {
      return NextResponse.json({ error: 'Program management required' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  if (!canManage && input.name) {
    return NextResponse.json({ error: 'Program management required' }, { status: 403 });
  }

  if (input.addExercise) {
    let catalog;
    try {
      catalog = await loadExerciseCatalog();
    } catch (err: any) {
      return NextResponse.json({ error: err.message || 'Unable to load exercise catalog' }, { status: 500 });
    }

    const catalogExercise = catalog.find((exercise) => exercise.id === input.addExercise!.exerciseId);
    if (!catalogExercise) {
      return NextResponse.json({ error: 'Unknown exercise id' }, { status: 422 });
    }

    const lastExerciseForDay = await prisma.exercise.findFirst({
      where: { programId: id, day: input.addExercise.day },
      orderBy: { order: 'desc' },
      select: { order: true },
    });

    const exercise = await prisma.exercise.create({
      data: {
        name: catalogExercise.exerciseName,
        muscleGroup: catalogExercise.category,
        day: input.addExercise.day,
        order: (lastExerciseForDay?.order ?? 0) + 1,
        defaultSets: input.addExercise.sets,
        defaultReps: input.addExercise.reps,
        notes: input.addExercise.notes || null,
        mediaUrl: catalogExercise.imageUrl || null,
        detailImageUrl: catalogExercise.detailImageUrl || null,
        programId: id,
      },
    });

    return NextResponse.json({ data: { exercise } });
  }

  if (input.removeExerciseId) {
    const exercise = await prisma.exercise.findFirst({
      where: { id: input.removeExerciseId, programId: id },
    });

    if (!exercise) {
      return NextResponse.json({ error: 'Exercise not found' }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.exercise.delete({ where: { id: exercise.id } });

      const remaining = await tx.exercise.findMany({
        where: { programId: id, day: exercise.day },
        orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
        select: { id: true },
      });

      await Promise.all(remaining.map((item, index) =>
        tx.exercise.update({
          where: { id: item.id },
          data: { order: index + 1 },
        })
      ));
    });

    return NextResponse.json({ data: { removedExerciseId: exercise.id } });
  }

  if (input.reorderExercises) {
    const { day, exerciseIds } = input.reorderExercises;
    const uniqueExerciseIds = new Set(exerciseIds);
    if (uniqueExerciseIds.size !== exerciseIds.length) {
      return NextResponse.json({ error: 'Exercise order contains duplicates' }, { status: 400 });
    }

    const exercisesForDay = await prisma.exercise.findMany({
      where: { programId: id, day },
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
      select: { id: true },
    });
    const currentExerciseIds = new Set(exercisesForDay.map((exercise) => exercise.id));

    const hasSameExercises = exerciseIds.length === exercisesForDay.length
      && exerciseIds.every((exerciseId) => currentExerciseIds.has(exerciseId));

    if (!hasSameExercises) {
      return NextResponse.json({ error: 'Exercise order must include every exercise for the selected day' }, { status: 400 });
    }

    const exercises = await prisma.$transaction(
      exerciseIds.map((exerciseId, index) =>
        prisma.exercise.update({
          where: { id: exerciseId },
          data: { order: index + 1 },
        })
      )
    );

    return NextResponse.json({ data: { exercises } });
  }

  const program = await prisma.program.update({
    where: { id },
    data: { name: input.name!.trim() },
  });

  return NextResponse.json({ data: program });
}

// DELETE program
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, response } = await requireAuth();
  if (response) return response;
  if (!isAdmin(user!) && !isTrainer(user!)) return NextResponse.json({ error: 'Program management required' }, { status: 403 });

  const { id } = await params;

  const program = await prisma.program.findFirst({
    where: { id },
    include: { user: { select: { id: true, trainerId: true, isAdmin: true, isTrainer: true, isTrainerUser: true } } },
  });
  if (!program) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (!canManageProgram(user!, program.user)) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (program.isActive) {
    return NextResponse.json({ error: 'Cannot delete the active program' }, { status: 400 });
  }

  const deletedProgramIds = await prisma.$transaction(async (tx) => {
    const affectedPrograms = await tx.program.findMany({
      where: {
        OR: [
          { id },
          {
            userId: { not: user!.id },
            name: program.name,
            programType: program.programType,
          },
        ],
      },
      select: { id: true },
    });
    const affectedProgramIds = affectedPrograms.map((affectedProgram) => affectedProgram.id);

    const affectedExercises = await tx.exercise.findMany({
      where: { programId: { in: affectedProgramIds } },
      select: { id: true },
    });
    const affectedExerciseIds = affectedExercises.map((exercise) => exercise.id);

    if (affectedExerciseIds.length > 0) {
      await tx.workoutLog.deleteMany({
        where: { exerciseId: { in: affectedExerciseIds } },
      });
    }

    await tx.program.deleteMany({
      where: { id: { in: affectedProgramIds } },
    });

    return affectedProgramIds;
  });

  return NextResponse.json({ success: true, deletedProgramIds }, { status: 200 });
}
