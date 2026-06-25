import { beforeEach, describe, expect, it, vi } from 'vitest';

const prismaMock = vi.hoisted(() => ({
  workoutLog: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  user: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
  },
  exercise: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
  },
}));

const requireAuthMock = vi.hoisted(() => vi.fn());

vi.mock('@/lib/auth', () => ({
  requireAuth: requireAuthMock,
}));

vi.mock('@/lib/prisma', () => ({
  prisma: prismaMock,
}));

import { GET, POST } from '@/app/api/leaderboard/entries/route';
import { PATCH, DELETE } from '@/app/api/leaderboard/entries/[id]/route';

const adminUser = { id: 'admin-1', isAdmin: true, isTrainer: false, isTrainerUser: false };
const nonAdminUser = { id: 'user-1', isAdmin: false, isTrainer: false, isTrainerUser: false };
const userId = 'cmcuid000000000000000001';
const exerciseId = 'cmcuid000000000000000002';

describe('leaderboard entries route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.workoutLog.findMany.mockResolvedValue([]);
    prismaMock.user.findMany.mockResolvedValue([]);
    prismaMock.exercise.findMany.mockResolvedValue([]);
    prismaMock.user.findUnique.mockResolvedValue({ id: userId });
    prismaMock.exercise.findUnique.mockResolvedValue({ id: exerciseId, name: 'Running' });
    prismaMock.workoutLog.findUnique.mockResolvedValue({ id: 'log-1' });
    prismaMock.workoutLog.create.mockResolvedValue({ id: 'log-1' });
    prismaMock.workoutLog.update.mockResolvedValue({ id: 'log-1' });
    prismaMock.workoutLog.delete.mockResolvedValue({ id: 'log-1' });
  });

  it('rejects non-admin users for listing and mutations', async () => {
    requireAuthMock.mockResolvedValue({ user: nonAdminUser, response: null });

    const listResponse = await GET();
    const createResponse = await POST(new Request('http://localhost/api/leaderboard/entries', {
      method: 'POST',
      body: JSON.stringify({}),
    }));
    const updateResponse = await PATCH(new Request('http://localhost/api/leaderboard/entries/log-1', {
      method: 'PATCH',
      body: JSON.stringify({}),
    }), { params: Promise.resolve({ id: 'log-1' }) });
    const deleteResponse = await DELETE(new Request('http://localhost/api/leaderboard/entries/log-1', {
      method: 'DELETE',
    }), { params: Promise.resolve({ id: 'log-1' }) });

    expect(listResponse.status).toBe(403);
    expect(createResponse.status).toBe(403);
    expect(updateResponse.status).toBe(403);
    expect(deleteResponse.status).toBe(403);
    expect(prismaMock.workoutLog.create).not.toHaveBeenCalled();
    expect(prismaMock.workoutLog.update).not.toHaveBeenCalled();
    expect(prismaMock.workoutLog.delete).not.toHaveBeenCalled();
  });

  it('creates endurance entries with distance and time while ignoring submitted weight', async () => {
    requireAuthMock.mockResolvedValue({ user: adminUser, response: null });

    const response = await POST(new Request('http://localhost/api/leaderboard/entries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        exerciseId,
        loggedAt: '2026-06-25T10:00:00.000Z',
        sets: 1,
        weight: 50,
        distanceKm: 5,
        durationSeconds: 1530,
        notes: 'Manual entry',
      }),
    }));

    expect(response.status).toBe(201);
    expect(prismaMock.workoutLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId,
        exerciseId,
        weight: 0,
        reps: 1,
        distanceKm: 5,
        durationSeconds: 1530,
      }),
    });
  });

  it('rejects incomplete endurance entries', async () => {
    requireAuthMock.mockResolvedValue({ user: adminUser, response: null });

    const response = await POST(new Request('http://localhost/api/leaderboard/entries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        exerciseId,
        loggedAt: '2026-06-25T10:00:00.000Z',
        sets: 1,
        distanceKm: 5,
      }),
    }));

    expect(response.status).toBe(422);
    expect(prismaMock.workoutLog.create).not.toHaveBeenCalled();
  });

  it('updates and deletes existing entries for admins', async () => {
    requireAuthMock.mockResolvedValue({ user: adminUser, response: null });
    prismaMock.exercise.findUnique.mockResolvedValue({ id: exerciseId, name: 'Bench Press' });

    const updateResponse = await PATCH(new Request('http://localhost/api/leaderboard/entries/log-1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        exerciseId,
        loggedAt: '2026-06-25T10:00:00.000Z',
        sets: 3,
        reps: 8,
        weight: 100,
      }),
    }), { params: Promise.resolve({ id: 'log-1' }) });
    const deleteResponse = await DELETE(new Request('http://localhost/api/leaderboard/entries/log-1', {
      method: 'DELETE',
    }), { params: Promise.resolve({ id: 'log-1' }) });

    expect(updateResponse.status).toBe(200);
    expect(deleteResponse.status).toBe(200);
    expect(prismaMock.workoutLog.update).toHaveBeenCalledWith({
      where: { id: 'log-1' },
      data: expect.objectContaining({ weight: 100, reps: 8, sets: 3 }),
    });
    expect(prismaMock.workoutLog.delete).toHaveBeenCalledWith({ where: { id: 'log-1' } });
  });
});
