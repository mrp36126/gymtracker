import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const AssignmentSchema = z.object({
  sourceProgramId: z.string().min(1),
  targetUserId: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const { user, response } = await requireAuth();
  if (response) return response;

  if (!user!.isAdmin) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  let input;
  try {
    input = AssignmentSchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: 'sourceProgramId and targetUserId are required' }, { status: 400 });
  }

  const [sourceProgram, targetUser] = await Promise.all([
    prisma.program.findFirst({
      where: { id: input.sourceProgramId, userId: user!.id },
      include: { exercises: true },
    }),
    prisma.user.findUnique({
      where: { id: input.targetUserId },
      select: { id: true, name: true, email: true },
    }),
  ]);

  if (!sourceProgram) {
    return NextResponse.json({ error: 'Source program not found' }, { status: 404 });
  }

  if (!targetUser) {
    return NextResponse.json({ error: 'Target user not found' }, { status: 404 });
  }

  const assignedProgram = await prisma.$transaction(async (tx) => {
    await tx.program.updateMany({
      where: {
        userId: targetUser.id,
        programType: sourceProgram.programType,
      },
      data: { isActive: false },
    });

    return tx.program.create({
      data: {
        name: sourceProgram.name,
        description: sourceProgram.description,
        csvUrl: sourceProgram.csvUrl,
        isActive: true,
        programType: sourceProgram.programType,
        userId: targetUser.id,
        exercises: {
          create: sourceProgram.exercises.map((exercise) => ({
            name: exercise.name,
            muscleGroup: exercise.muscleGroup,
            day: exercise.day,
            order: exercise.order,
            defaultSets: exercise.defaultSets,
            defaultReps: exercise.defaultReps,
            notes: exercise.notes,
            mediaUrl: exercise.mediaUrl,
            detailImageUrl: exercise.detailImageUrl,
          })),
        },
      },
      include: { _count: { select: { exercises: true } } },
    });
  });

  return NextResponse.json({
    data: {
      program: assignedProgram,
      user: targetUser,
    },
  }, { status: 201 });
}
