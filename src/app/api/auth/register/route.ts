import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createSupabaseServerClient } from '@/lib/supabase';
import { prisma } from '@/lib/prisma';

const RegisterSchema = z.object({
  name:     z.string().min(2).max(50),
  email:    z.string().email(),
  password: z.string().min(8),
});

export async function POST(req: NextRequest) {
  try {
    const body = RegisterSchema.parse(await req.json());
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase.auth.signUp({
      email: body.email,
      password: body.password,
    });

    if (error || !data.user) {
      return NextResponse.json({ error: error?.message ?? 'Sign up failed' }, { status: 400 });
    }

    const user = await prisma.user.create({
      data: {
        supabaseId: data.user.id,
        name:       body.name,
        email:      body.email,
      },
    });

    return NextResponse.json({ data: { id: user.id, name: user.name } }, { status: 201 });
  } catch (err: any) {
    if (err.name === 'ZodError') {
      return NextResponse.json({ error: err.errors }, { status: 422 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
