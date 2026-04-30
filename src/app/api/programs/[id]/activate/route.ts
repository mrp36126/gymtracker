import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireAuth();
  if (response) return response;

  const { id } = await params;

  await prisma.program.updateMany({ where: { userId: user!.id }, data: { isActive: false } });
  await prisma.program.update({ where: { id }, data: { isActive: true } });

  return NextResponse.redirect(new URL('/program', req.url));
}
