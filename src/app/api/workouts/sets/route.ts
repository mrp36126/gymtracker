import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { findActivePrimaryProgramForUser, findExerciseForUser } from '@/lib/program-scope';
import { z } from 'zod';

const SetSchema = z.object({
  exerciseId: z.string().cuid(),
  setNumber:  z.number().int().positive(),
  weight:     z.number().nonnegative(),
  reps:       z.number().int().positive(),
});

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

  const exerciseOk = await findExerciseForUser(body.exerciseId, user!.id);
  if (!exerciseOk) {
    return NextResponse.json({ error: 'Exercise not found' }, { status: 404 });
  }

  const log = await prisma.workoutLog.create({
    data: {
      weight:     body.weight,
      sets:       1,
      reps:       body.reps,
      notes:      `Set ${body.setNumber}`,
      userId:     user!.id,
      exerciseId: body.exerciseId,
    },
  });

  return NextResponse.json({ data: log }, { status: 201 });
}
