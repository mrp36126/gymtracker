import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { loadExerciseCatalog } from '@/lib/exercise-catalog';
import { requireAuth } from '@/lib/auth';
import { isAdmin } from '@/lib/rbac';
import { prisma } from '@/lib/prisma';

const ExerciseCatalogPayloadSchema = z.object({
  id: z.string().min(2).max(50).optional(),
  exerciseName: z.string().min(2).max(120),
  category: z.string().min(2).max(80),
  primaryMuscles: z.array(z.string().min(1)).min(1),
  secondaryMuscles: z.array(z.string().min(1)).default([]),
  equipment: z.string().min(2).max(80),
  difficulty: z.string().min(2).max(40),
  description: z.string().min(2).max(300),
  instructions: z.string().min(2).max(1000),
  imageUrl: z.string().optional(),
  detailImageUrl: z.string().optional(),
});

export async function GET() {
  const { response } = await requireAuth();
  if (response) return response;

  try {
    const exercises = await loadExerciseCatalog();
    return NextResponse.json({ exercises });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to load exercise catalog' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const { user, response } = await requireAuth();
  if (response) return response;

  if (!isAdmin(user)) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  let payload: z.infer<typeof ExerciseCatalogPayloadSchema>;
  try {
    payload = ExerciseCatalogPayloadSchema.parse(await req.json());
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues.map((issue) => issue.message).join('\n') }, { status: 422 });
    }
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  try {
    const { id: requestedId, ...rest } = payload;

    const created = await prisma.exerciseCatalog.create({
      data: {
        id: requestedId?.trim() || crypto.randomUUID(),
        ...rest,
        imageUrl: rest.imageUrl || null,
        detailImageUrl: rest.detailImageUrl || null,
      },
    });

    return NextResponse.json({ data: created }, { status: 201 });
  } catch (err: any) {
    const message = typeof err?.message === 'string' && err.message.length > 0
      ? err.message
      : 'Failed to create exercise';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
