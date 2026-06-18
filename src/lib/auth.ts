import { createSupabaseServerClient } from './supabase';
import { prisma } from './prisma';
import { NextResponse } from 'next/server';

export async function getAuthUser() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return null;

    let dbUser = await prisma.user.findUnique({
      where: { supabaseId: user.id },
    });

    if (!dbUser) {
      const name =
        (user.user_metadata as { full_name?: string; name?: string } | undefined)?.full_name
        || (user.user_metadata as { full_name?: string; name?: string } | undefined)?.name
        || user.email
        || 'Unknown';

      dbUser = await prisma.user.create({
        data: {
          supabaseId: user.id,
          name,
          email: user.email ?? `${user.id}@unknown`,
        },
      });
    }

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
