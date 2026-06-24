import { beforeEach, describe, expect, it, vi } from 'vitest';

const getUserMock = vi.hoisted(() => vi.fn());

const prismaMock = vi.hoisted(() => ({
  user: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock('@/lib/supabase', () => ({
  createSupabaseServerClient: vi.fn(async () => ({
    auth: {
      getUser: getUserMock,
    },
  })),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: prismaMock,
}));

import { getAuthUser } from '@/lib/auth';

describe('getAuthUser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rebinds an existing account by email before creating a new user row', async () => {
    getUserMock.mockResolvedValueOnce({
      data: {
        user: {
          id: 'supabase-user-2',
          email: 'Pierre@Example.com',
          user_metadata: {},
        },
      },
      error: null,
    });

    prismaMock.user.findUnique.mockResolvedValueOnce(null);
    prismaMock.user.findFirst.mockResolvedValueOnce({
      id: 'existing-user-1',
      email: 'pierre@example.com',
      supabaseId: 'supabase-user-1',
    });
    prismaMock.user.update.mockResolvedValueOnce({
      id: 'existing-user-1',
      email: 'pierre@example.com',
      supabaseId: 'supabase-user-2',
    });

    const user = await getAuthUser();

    expect(prismaMock.user.create).not.toHaveBeenCalled();
    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: 'existing-user-1' },
      data: {
        supabaseId: 'supabase-user-2',
        email: 'pierre@example.com',
      },
    });
    expect(user).toEqual({
      id: 'existing-user-1',
      email: 'pierre@example.com',
      supabaseId: 'supabase-user-2',
    });
  });
});