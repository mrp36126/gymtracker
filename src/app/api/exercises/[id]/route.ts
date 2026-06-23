import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { isAdmin } from '@/lib/rbac';

const UpdateExerciseCatalogSchema = z.object({
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

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireAuth();
  if (response) return response;

  if (!isAdmin(user)) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  const { id } = await params;

  let payload: z.infer<typeof UpdateExerciseCatalogSchema>;
  try {
    payload = UpdateExerciseCatalogSchema.parse(await req.json());
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues.map((issue) => issue.message).join('\n') }, { status: 422 });
    }
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  try {
    const mediaData = {
      ...(payload.imageUrl !== undefined ? { imageUrl: payload.imageUrl || null } : {}),
      ...(payload.detailImageUrl !== undefined ? { detailImageUrl: payload.detailImageUrl || null } : {}),
    };

    const updated = await prisma.exerciseCatalog.update({
      where: { id },
      data: {
        exerciseName: payload.exerciseName,
        category: payload.category,
        primaryMuscles: payload.primaryMuscles,
        secondaryMuscles: payload.secondaryMuscles,
        equipment: payload.equipment,
        difficulty: payload.difficulty,
        description: payload.description,
        instructions: payload.instructions,
        ...mediaData,
      },
    });

    return NextResponse.json({ data: updated });
  } catch {
    return NextResponse.json({ error: 'Exercise not found' }, { status: 404 });
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireAuth();
  if (response) return response;

  if (!isAdmin(user)) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  const { id } = await params;

  try {
    await prisma.exerciseCatalog.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Exercise not found' }, { status: 404 });
  }
}
