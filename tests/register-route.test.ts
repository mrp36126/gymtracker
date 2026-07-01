import { beforeEach, describe, expect, it, vi } from 'vitest';

const signUpMock = vi.hoisted(() => vi.fn());

const prismaMock = vi.hoisted(() => ({
  user: {
    findUnique: vi.fn(),
    create: vi.fn(),
  },
}));

vi.mock('@/lib/supabase', () => ({
  createSupabaseServerClient: vi.fn(async () => ({
    auth: {
      signUp: signUpMock,
    },
  })),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: prismaMock,
}));

import { POST } from '@/app/api/auth/register/route';

describe('register route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('defaults a brand-new registration to Trainer User role', async () => {
    signUpMock.mockResolvedValueOnce({
      data: {
        user: {
          id: 'supabase-user-10',
        },
      },
      error: null,
    });

    prismaMock.user.findUnique.mockResolvedValueOnce(null);
    prismaMock.user.create.mockResolvedValueOnce({
      id: 'db-user-10',
      name: 'Fresh User',
      email: 'fresh@example.com',
      isAdmin: false,
      isTrainer: false,
      isTrainerUser: true,
    });

    const response = await POST(new Request('http://localhost/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Fresh User',
        email: 'fresh@example.com',
        password: 'Password123',
      }),
    }) as any);

    expect(response.status).toBe(201);
    expect(prismaMock.user.create).toHaveBeenCalledWith({
      data: {
        supabaseId: 'supabase-user-10',
        name: 'Fresh User',
        email: 'fresh@example.com',
        isAdmin: false,
        isTrainer: false,
        isTrainerUser: true,
      },
    });
  });

  it('does not alter existing users when supabaseId is already linked', async () => {
    signUpMock.mockResolvedValueOnce({
      data: {
        user: {
          id: 'supabase-user-existing',
        },
      },
      error: null,
    });

    prismaMock.user.findUnique.mockResolvedValueOnce({
      id: 'existing-user',
      name: 'Existing User',
      email: 'existing@example.com',
      isAdmin: true,
      isTrainer: false,
      isTrainerUser: false,
    });

    const response = await POST(new Request('http://localhost/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Ignored Name',
        email: 'existing@example.com',
        password: 'Password123',
      }),
    }) as any);

    expect(response.status).toBe(201);
    expect(prismaMock.user.create).not.toHaveBeenCalled();
  });
});
