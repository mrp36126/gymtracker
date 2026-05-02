import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
const program = await prisma.program.findUnique({ where: { id } });
if (!program) return NextResponse.json({ error: 'Not found' }, { status: 404 });

// Only deactivate programs of the same type
await prisma.program.updateMany({
  where: { programType: program.programType },
  data: { isActive: false },
});

await prisma.program.update({
  where: { id },
  data: { isActive: true },
});

  return NextResponse.json({ success: true });
}
