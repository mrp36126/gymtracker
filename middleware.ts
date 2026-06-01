import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

const INACTIVITY_COOKIE_NAME = 'gymtracker-last-activity';
const INACTIVITY_TIMEOUT_MS = 24 * 60 * 60 * 1000;
const ACTIVITY_COOKIE_MAX_AGE = 400 * 24 * 60 * 60;

function hasExceededInactivityTimeout(request: NextRequest) {
  const lastActivity = request.cookies.get(INACTIVITY_COOKIE_NAME)?.value;
  const lastActivityAt = lastActivity ? Number(lastActivity) : NaN;

  return Number.isFinite(lastActivityAt)
    && lastActivityAt > 0
    && Date.now() - lastActivityAt > INACTIVITY_TIMEOUT_MS;
}

function setLastActivityCookie(request: NextRequest, response: NextResponse) {
  response.cookies.set({
    name: INACTIVITY_COOKIE_NAME,
    value: Date.now().toString(),
    httpOnly: true,
    sameSite: 'lax',
    secure: request.nextUrl.protocol === 'https:',
    path: '/',
    maxAge: ACTIVITY_COOKIE_MAX_AGE,
  });
}

function clearSessionCookies(request: NextRequest, response: NextResponse) {
  for (const cookie of request.cookies.getAll()) {
    if (cookie.name.startsWith('sb-') || cookie.name === INACTIVITY_COOKIE_NAME) {
      response.cookies.set({
        name: cookie.name,
        value: '',
        path: '/',
        maxAge: 0,
      });
    }
  }
}

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request: { headers: request.headers } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return request.cookies.get(name)?.value; },
        set(name: string, value: string, options: Record<string, unknown>) {
          response.cookies.set({ name, value, ...options } as any);
        },
        remove(name: string, options: Record<string, unknown>) {
          response.cookies.set({ name, value: '', ...options } as any);
        },
      },
    }
  );

  let user = null;
  try {
    const { data: { user: u }, error } = await supabase.auth.getUser();
    if (!error && u) user = u;
  } catch {
    // ignore
  }

  const isDashboardRoute = request.nextUrl.pathname.startsWith('/welcome')
    || request.nextUrl.pathname.startsWith('/program')
    || request.nextUrl.pathname.startsWith('/workout')
    || request.nextUrl.pathname.startsWith('/progress')
    || request.nextUrl.pathname.startsWith('/admin')
    || request.nextUrl.pathname.startsWith('/supplementary')
    || request.nextUrl.pathname.startsWith('/custom-workout')
    || request.nextUrl.pathname.startsWith('/hyrox')
    || request.nextUrl.pathname.startsWith('/leaderboard');
  const isApiRoute = request.nextUrl.pathname.startsWith('/api');

  if (user && hasExceededInactivityTimeout(request)) {
    const expiredResponse = isApiRoute
      ? NextResponse.json({ error: 'Session expired due to inactivity' }, { status: 401 })
      : NextResponse.redirect(new URL('/login', request.url));

    clearSessionCookies(request, expiredResponse);
    return expiredResponse;
  }

  if (!user && isDashboardRoute) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (user && (request.nextUrl.pathname === '/login'
    || request.nextUrl.pathname === '/register')) {
    const redirectResponse = NextResponse.redirect(new URL('/welcome', request.url));
    setLastActivityCookie(request, redirectResponse);
    return redirectResponse;
  }

  if (user) {
    setLastActivityCookie(request, response);
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
