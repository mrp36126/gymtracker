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

  it('creates a trainer-user account by default when no local row exists', async () => {
    getUserMock.mockResolvedValueOnce({
      data: {
        user: {
          id: 'supabase-user-3',
          email: 'new.user@example.com',
          user_metadata: { name: 'New User' },
        },
      },
      error: null,
    });

    prismaMock.user.findUnique.mockResolvedValueOnce(null);
    prismaMock.user.findFirst.mockResolvedValueOnce(null);
    prismaMock.user.create.mockResolvedValueOnce({
      id: 'new-user-1',
      email: 'new.user@example.com',
      supabaseId: 'supabase-user-3',
      isAdmin: false,
      isTrainer: false,
      isTrainerUser: true,
    });

    const user = await getAuthUser();

    expect(prismaMock.user.create).toHaveBeenCalledWith({
      data: {
        supabaseId: 'supabase-user-3',
        name: 'New User',
        email: 'new.user@example.com',
        isAdmin: false,
        isTrainer: false,
        isTrainerUser: true,
      },
    });
    expect(user).toEqual({
      id: 'new-user-1',
      email: 'new.user@example.com',
      supabaseId: 'supabase-user-3',
      isAdmin: false,
      isTrainer: false,
      isTrainerUser: true,
    });
  });
});