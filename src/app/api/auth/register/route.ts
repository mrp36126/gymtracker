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

    if (error) {
      console.error('Supabase signUp error:', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (!data.user) {
      return NextResponse.json({ error: 'No user returned from Supabase' }, { status: 400 });
    }

    // Check if user already exists in our DB
    const existing = await prisma.user.findUnique({
      where: { supabaseId: data.user.id },
    });

    if (existing) {
      return NextResponse.json({ data: { id: existing.id, name: existing.name } }, { status: 201 });
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
    console.error('Register error:', err);
    if (err.name === 'ZodError') {
      return NextResponse.json({
        error: err.errors.map((e: any) => e.message).join(', ')
      }, { status: 422 });
    }
    return NextResponse.json({ error: err.message ?? 'Internal server error' }, { status: 500 });
  }
}
