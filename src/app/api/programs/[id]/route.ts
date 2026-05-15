import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { findActivePrimaryProgramForUser } from '@/lib/program-scope';

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
  const { name } = await req.json();

  if (!name?.trim()) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  }

  const existing = await prisma.program.findFirst({
    where: { id, userId: user!.id },
  });
  if (!existing) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const program = await prisma.program.update({
    where: { id },
    data: { name: name.trim() },
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
