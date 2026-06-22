import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth';
import { loadExerciseCatalog } from '@/lib/exercise-catalog';
import { prisma } from '@/lib/prisma';
import { getTodayName } from '@/lib/day-resolver';
import { getNowInSAST, getStartOfTodayInSAST } from '@/lib/timezone';

const SelectedCustomExerciseSchema = z.object({
  exerciseId: z.string().min(1),
  sets: z.coerce.number().int().positive().max(20).optional(),
  reps: z.string().regex(/^\d+(-\d+)?$/, 'Reps must be e.g. 10 or 8-12').optional(),
  notes: z.string().max(1000).optional().default(''),
});

const CustomSessionSchema = z.object({
  exercises: z.array(SelectedCustomExerciseSchema).min(1, 'Choose at least one exercise'),
});

function sessionDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

export async function POST(req: NextRequest) {
  const { user, response } = await requireAuth();
  if (response) return response;

  if (user!.isTrainerUser) {
    return NextResponse.json({ error: 'Trainer users cannot start custom workouts' }, { status: 403 });
  }

  let parsedBody: z.infer<typeof CustomSessionSchema>;
  try {
    parsedBody = CustomSessionSchema.parse(await req.json());
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues.map((issue) => issue.message).join('\n') }, { status: 422 });
    }
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const catalog = await loadExerciseCatalog();
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
  const name = `Custom Session · ${sessionDateKey(now)}`;

  const sessionProgram = await prisma.$transaction(async (tx) => {
    await tx.program.updateMany({
      where: {
        userId: user!.id,
        programType: 'primary',
        isActive: true,
      },
      data: { isActive: false },
    });

    await tx.program.deleteMany({
      where: {
        userId: user!.id,
        programType: 'primary',
        name: { startsWith: 'Custom Session · ' },
        createdAt: { gte: startOfToday },
      },
    });

    return tx.program.create({
      data: {
        name,
        description: `Custom workout for ${todayName}`,
        programType: 'primary',
        isActive: true,
        userId: user!.id,
        exercises: {
          create: parsedBody.exercises.map((selectedExercise, index) => {
            const catalogExercise = catalogById.get(selectedExercise.exerciseId)!;
            return {
              name: catalogExercise.exerciseName,
              muscleGroup: catalogExercise.category,
              day: todayName,
              order: index + 1,
              defaultSets: selectedExercise.sets ?? 3,
              defaultReps: selectedExercise.reps ?? '10',
              notes: selectedExercise.notes || catalogExercise.instructions,
              mediaUrl: catalogExercise.imageUrl || null,
              detailImageUrl: catalogExercise.detailImageUrl || null,
            };
          }),
        },
      },
      include: { _count: { select: { exercises: true } } },
    });
  });

  return NextResponse.json({ data: { programId: sessionProgram.id, exercises: sessionProgram._count.exercises, day: todayName } }, { status: 201 });
}
