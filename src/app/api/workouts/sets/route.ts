import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const SetSchema = z.object({
  exerciseId: z.string(),
  setNumber:  z.number().int().positive(),
  weight:     z.number().nonnegative(),
  reps:       z.number().int().positive(),
});

export async function POST(req: NextRequest) {
  const { user, response } = await requireAuth();
  if (response) return response;

  const body = SetSchema.parse(await req.json());

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
