import { beforeEach, describe, expect, it, vi } from 'vitest';

const authUser = { id: 'trainer-1', isAdmin: false, isTrainer: true, isTrainerUser: false };

const prismaMock = vi.hoisted(() => ({
  user: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock('@/lib/auth', () => ({
  requireAuth: vi.fn(async () => ({ user: authUser, response: null })),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: prismaMock,
}));

import { DELETE, PATCH } from '@/app/api/trainer/users/[id]/route';

describe('trainer user assignment route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('assigns an available trainer user to the current trainer', async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: 'user-1',
      trainerId: null,
      isTrainerUser: true,
    });
    prismaMock.user.update.mockResolvedValue({
      id: 'user-1',
      name: 'Athlete',
      email: 'athlete@example.com',
      trainerId: 'trainer-1',
      isTrainerUser: true,
    });

    const response = await PATCH(new Request('http://localhost/api/trainer/users/user-1', { method: 'PATCH' }), {
      params: Promise.resolve({ id: 'user-1' }),
    });

    expect(response.status).toBe(200);
    expect(prismaMock.user.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'user-1' },
      data: { trainerId: 'trainer-1' },
    }));
  });

  it('removes a trainer user from the current trainer', async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: 'user-1',
      trainerId: 'trainer-1',
      isTrainerUser: true,
    });
    prismaMock.user.update.mockResolvedValue({
      id: 'user-1',
      trainerId: null,
      isTrainerUser: true,
    });

    const response = await DELETE(new Request('http://localhost/api/trainer/users/user-1', { method: 'DELETE' }), {
      params: Promise.resolve({ id: 'user-1' }),
    });

    expect(response.status).toBe(200);
    expect(prismaMock.user.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'user-1' },
      data: { trainerId: null },
    }));
  });

  it('blocks assigning a trainer user who belongs to another trainer', async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: 'user-1',
      trainerId: 'other-trainer',
      isTrainerUser: true,
    });

    const response = await PATCH(new Request('http://localhost/api/trainer/users/user-1', { method: 'PATCH' }), {
      params: Promise.resolve({ id: 'user-1' }),
    });

    expect(response.status).toBe(403);
    expect(prismaMock.user.update).not.toHaveBeenCalled();
  });
});