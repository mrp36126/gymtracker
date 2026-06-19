import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { canManageProgram } from '@/lib/program-scope';
import { isAdmin, isTrainer } from '@/lib/rbac';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, response } = await requireAuth();
  if (response) return response;

  if (!isAdmin(user!) && !isTrainer(user!)) {
    return NextResponse.json({ error: 'Program management required' }, { status: 403 });
  }

  const { id } = await params;

  const program = await prisma.program.findFirst({
    where: { id },
    include: { user: { select: { id: true, trainerId: true, isAdmin: true, isTrainer: true, isTrainerUser: true } } },
  });

  if (!program) {
    return NextResponse.json({ error: 'Program not found' }, { status: 404 });
  }

  if (!canManageProgram(user!, program.user)) {
    return NextResponse.json({ error: 'Program not found' }, { status: 404 });
  }

  await prisma.program.updateMany({
    where: { programType: program.programType, userId: program.userId },
    data: { isActive: false },
  });

  // Activate this one
  const updated = await prisma.program.update({
    where: { id },
    data: { isActive: true },
  });

  return NextResponse.json({ 
    success: true, 
    program: updated 
  });
}
