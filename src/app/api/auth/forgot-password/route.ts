import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createSupabaseServerClient } from '@/lib/supabase';

const ForgotPasswordSchema = z.object({
  email: z.string().email(),
});

function getAppBaseUrl(req: NextRequest) {
  const configuredUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL;
  if (configuredUrl) {
    return configuredUrl.replace(/\/$/, '');
  }

  const forwardedProto = req.headers.get('x-forwarded-proto') ?? 'http';
  const forwardedHost = req.headers.get('x-forwarded-host');
  const host = req.headers.get('host');

  if (forwardedHost) {
    return `${forwardedProto}://${forwardedHost}`;
  }

  if (host) {
    return `${forwardedProto}://${host}`;
  }

  return 'http://localhost:3000';
}

export async function POST(req: NextRequest) {
  try {
    const body = ForgotPasswordSchema.parse(await req.json());

    const supabase = await createSupabaseServerClient();
    const baseUrl = getAppBaseUrl(req);
    const redirectTo = new URL('/reset-password?type=recovery', `${baseUrl}/`).toString();

    const { error } = await supabase.auth.resetPasswordForEmail(body.email, { redirectTo });

    if (error) {
      console.error('Supabase resetPasswordForEmail error:', error);
      return NextResponse.json(
        { error: 'Unable to send a password reset email right now.' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { message: 'If an account exists for this email, a password reset link has been sent.' },
      { status: 200 }
    );
  } catch (err: any) {
    if (err.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Please provide a valid email address.' },
        { status: 422 }
      );
    }

    return NextResponse.json(
      { error: 'Unable to process your password reset request right now.' },
      { status: 500 }
    );
  }
}
