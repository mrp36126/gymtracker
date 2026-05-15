import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const RoleSchema = z.object({
  isAdmin: z.boolean(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, response } = await requireAuth();
  if (response) return response;

  if (!user!.isAdmin) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  const { id } = await params;
  if (id === user!.id) {
    return NextResponse.json({ error: 'You cannot change your own admin status here' }, { status: 400 });
  }

  let input;
  try {
    input = RoleSchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: 'isAdmin must be a boolean' }, { status: 400 });
  }

  const targetUser = await prisma.user.findUnique({
    where: { id },
    select: { id: true },
  });

  if (!targetUser) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const updatedUser = await prisma.user.update({
    where: { id },
    data: { isAdmin: input.isAdmin },
    select: { id: true, name: true, email: true, isAdmin: true },
  });

  return NextResponse.json({ data: updatedUser });
}
