import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { findActivePrimaryProgramForUser } from '@/lib/program-scope';
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
}).refine((value) => value.name || value.addExercise || value.removeExerciseId, {
  message: 'Provide a program name, exercise to add, or exercise to remove',
});

// GET single program
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, response } = await requireAuth();
  if (response) return response;
  if (!user!.isAdmin) {
    const activePrimaryProgram = await findActivePrimaryProgramForUser(user!.id);
    if (!activePrimaryProgram) {
      return NextResponse.json({ error: 'Program assignment required' }, { status: 403 });
    }
  }
  const { id } = await params;

  const program = await prisma.program.findFirst({
    where: { id, userId: user!.id },
    include: { exercises: { orderBy: [{ day: 'asc' }, { order: 'asc' }] } },
  });

  if (!program) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ data: program });
}

// PATCH — rename program
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, response } = await requireAuth();
  if (response) return response;
  if (!user!.isAdmin) return NextResponse.json({ error: 'Admin only' }, { status: 403 });

  const { id } = await params;
  let input;
  try {
    input = PatchProgramSchema.parse(await req.json());
  } catch (err: any) {
    const message = err?.issues?.map((issue: z.ZodIssue) => issue.message).join('\n') || 'Invalid request';
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const existing = await prisma.program.findFirst({
    where: { id, userId: user!.id },
  });
  if (!existing) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
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
  if (!user!.isAdmin) return NextResponse.json({ error: 'Admin only' }, { status: 403 });

  const { id } = await params;

  const program = await prisma.program.findFirst({
    where: { id, userId: user!.id },
  });
  if (!program) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (program.isActive) {
    return NextResponse.json({ error: 'Cannot delete the active program' }, { status: 400 });
  }

  await prisma.program.delete({ where: { id } });
  return NextResponse.json({ success: true }, { status: 200 });
}
