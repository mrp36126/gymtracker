import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { isAdmin, isTrainer } from '@/lib/rbac';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, response } = await requireAuth();
  if (response) return response;

  if (!isAdmin(user!) && !isTrainer(user!)) {
    return NextResponse.json({ error: 'Trainer access required' }, { status: 403 });
  }

  const { id } = await params;
  const targetUser = await prisma.user.findUnique({
    where: { id },
    select: { id: true, trainerId: true, isTrainerUser: true },
  });

  if (!targetUser || !targetUser.isTrainerUser) {
    return NextResponse.json({ error: 'Trainer user not found' }, { status: 404 });
  }

  if (!isAdmin(user!) && targetUser.trainerId && targetUser.trainerId !== user!.id) {
    return NextResponse.json({ error: 'Trainer user is assigned to another trainer' }, { status: 403 });
  }

  const updated = await prisma.user.update({
    where: { id },
    data: { trainerId: isAdmin(user!) ? targetUser.trainerId ?? user!.id : user!.id },
    select: { id: true, name: true, email: true, trainerId: true, isTrainerUser: true },
  });

  return NextResponse.json({ data: updated });
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, response } = await requireAuth();
  if (response) return response;

  if (!isAdmin(user!) && !isTrainer(user!)) {
    return NextResponse.json({ error: 'Trainer access required' }, { status: 403 });
  }

  const { id } = await params;
  const targetUser = await prisma.user.findUnique({
    where: { id },
    select: { id: true, trainerId: true, isTrainerUser: true },
  });

  if (!targetUser || !targetUser.isTrainerUser) {
    return NextResponse.json({ error: 'Trainer user not found' }, { status: 404 });
  }

  if (!isAdmin(user!) && targetUser.trainerId !== user!.id) {
    return NextResponse.json({ error: 'Trainer user is assigned to another trainer' }, { status: 403 });
  }

  await prisma.user.update({
    where: { id },
    data: { trainerId: null },
  });

  return NextResponse.json({ success: true });
}