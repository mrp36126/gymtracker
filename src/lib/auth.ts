import { createSupabaseServerClient } from './supabase';
import { prisma } from './prisma';
import { NextResponse } from 'next/server';

export async function getAuthUser() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return null;

    const dbUser = await prisma.user.findUnique({
      where: { supabaseId: user.id },
    });
    return dbUser;
  } catch {
    return null;
  }
}

export async function requireAuth() {
  const user = await getAuthUser();
  if (!user) {
    return {
      user: null,
      response: NextResponse.json({ error: 'Unauthorised' }, { status: 401 }),
    };
  }
  return { user, response: null };
}
