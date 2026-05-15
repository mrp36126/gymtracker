import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createSupabaseAdminClient } from '@/lib/supabase';

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, response } = await requireAuth();
  if (response) return response;

  if (!user!.isAdmin) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  const { id } = await params;
  if (id === user!.id) {
    return NextResponse.json({ error: 'You cannot delete your own account here' }, { status: 400 });
  }

  const targetUser = await prisma.user.findUnique({
    where: { id },
    select: { id: true, supabaseId: true, name: true, email: true },
  });

  if (!targetUser) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const supabaseAdmin = createSupabaseAdminClient();
  const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(targetUser.supabaseId, false);

  const authUserAlreadyMissing =
    authDeleteError?.message.toLowerCase().includes('user not found');

  if (authDeleteError && !authUserAlreadyMissing) {
    return NextResponse.json({ error: authDeleteError.message }, { status: 400 });
  }

  await prisma.user.delete({
    where: { id: targetUser.id },
  });

  return NextResponse.json({
    success: true,
    data: {
      id: targetUser.id,
      name: targetUser.name,
      email: targetUser.email,
    },
  });
}
