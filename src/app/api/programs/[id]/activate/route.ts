import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, response } = await requireAuth();
  if (response) return response;

  if (!user!.isAdmin) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  const { id } = await params;

  // Find the program
  const program = await prisma.program.findUnique({
    where: { id },
  });

  if (!program) {
    return NextResponse.json({ error: 'Program not found' }, { status: 404 });
  }

  // Deactivate all other programs first
  await prisma.program.updateMany({
    where: { programType: program.programType },
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
