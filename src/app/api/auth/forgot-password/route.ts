import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createSupabaseServerClient } from '@/lib/supabase';

const ForgotPasswordSchema = z.object({
  email: z.string().email(),
});

function getAppUrl(req: NextRequest) {
  const configuredUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL;
  if (configuredUrl) {
    return configuredUrl.replace(/\/$/, '');
  }

  try {
    return new URL(req.url).origin;
  } catch {
    const forwardedProto = req.headers.get('x-forwarded-proto') ?? 'https';
    const forwardedHost = req.headers.get('x-forwarded-host');
    const host = req.headers.get('host');

    if (forwardedHost) {
      return `${forwardedProto}://${forwardedHost}`;
    }

    if (host) {
      return `${forwardedProto}://${host}`;
    }
  }

  return 'https://gymtracker-six-psi.vercel.app';
}

export async function POST(req: NextRequest) {
  try {
    const body = ForgotPasswordSchema.parse(await req.json());
    const supabase = await createSupabaseServerClient();
    const appUrl = getAppUrl(req);
    const redirectTo = `${appUrl}/reset-password`;

    const { error } = await supabase.auth.resetPasswordForEmail(body.email, { redirectTo });

    if (error) {
      console.error('Supabase resetPasswordForEmail error:', error);
      return NextResponse.json({ error: 'Unable to send password reset email. Please try again.' }, { status: 400 });
    }

    return NextResponse.json({ message: 'If an account exists for that email, a reset link has been sent.' }, { status: 200 });
  } catch (err: any) {
    console.error('Forgot password route error:', err);
    if (err.name === 'ZodError') {
      return NextResponse.json({ error: 'Please provide a valid email address.' }, { status: 422 });
    }
    return NextResponse.json({ error: 'Unable to process your password reset request right now.' }, { status: 500 });
  }
}
