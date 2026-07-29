import { beforeEach, describe, expect, it, vi } from 'vitest';

const resetPasswordForEmailMock = vi.hoisted(() => vi.fn());

vi.mock('@/lib/supabase', () => ({
  createSupabaseServerClient: vi.fn(async () => ({
    auth: {
      resetPasswordForEmail: resetPasswordForEmailMock,
    },
  })),
}));

import { POST } from '@/app/api/auth/forgot-password/route';

describe('POST /api/auth/forgot-password', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns a success response when a reset email is sent', async () => {
    resetPasswordForEmailMock.mockResolvedValueOnce({ error: null });

    const req = new Request('http://localhost/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'user@example.com' }),
    }) as any;

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.message).toContain('password reset link');
  });

  it('uses the configured site URL for the recovery redirect', async () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://gymtracker.example.com';
    resetPasswordForEmailMock.mockResolvedValueOnce({ error: null });

    const req = new Request('http://localhost/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'user@example.com' }),
    }) as any;

    await POST(req);

    expect(resetPasswordForEmailMock).toHaveBeenCalledWith(
      'user@example.com',
      expect.objectContaining({
        redirectTo: 'https://gymtracker.example.com/reset-password?type=recovery',
      })
    );
  });

  it('rejects invalid email payloads', async () => {
    const req = new Request('http://localhost/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'invalid-email' }),
    }) as any;

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(422);
    expect(json.error).toContain('valid email');
  });
});
