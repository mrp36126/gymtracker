import { beforeEach, describe, expect, it, vi } from 'vitest';

const authUser = { id: 'user-1', email: 'user@example.com', isAdmin: false, isTrainer: false, isTrainerUser: false };

const prismaMock = vi.hoisted(() => ({
  workoutLog: {
    findFirst: vi.fn(),
    findMany: vi.fn(),
  },
}));

const requireAuthMock = vi.hoisted(() => vi.fn());
const resolveManagedTargetUserMock = vi.hoisted(() => vi.fn());

vi.mock('@/lib/auth', () => ({
  requireAuth: requireAuthMock,
}));

vi.mock('@/lib/prisma', () => ({
  prisma: prismaMock,
}));

vi.mock('@/lib/trainer-context', () => ({
  resolveManagedTargetUser: resolveManagedTargetUserMock,
}));

import { GET } from '@/app/api/workouts/previous/route';

describe('workout previous route', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    requireAuthMock.mockResolvedValue({ user: authUser, response: null });
    resolveManagedTargetUserMock.mockResolvedValue({ id: 'user-1', email: 'user@example.com' });
  });

  it('returns latest previous workout sets for an exercise', async () => {
    prismaMock.workoutLog.findFirst.mockResolvedValueOnce({
      id: 'log-2',
      loggedAt: new Date('2026-06-25T10:15:00.000Z'),
    });
    prismaMock.workoutLog.findMany.mockResolvedValueOnce([
      {
        id: 'set-1',
        weight: 100,
        reps: 10,
        durationSeconds: null,
        distanceKm: null,
        notes: 'Set 1',
        loggedAt: new Date('2026-06-25T10:15:00.000Z'),
      },
      {
        id: 'set-2',
        weight: 95,
        reps: 8,
        durationSeconds: null,
        distanceKm: null,
        notes: 'Set 2',
        loggedAt: new Date('2026-06-25T10:17:00.000Z'),
      },
    ]);

    const response = await GET(new Request('http://localhost/api/workouts/previous?exerciseId=exercise-1'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.sets).toHaveLength(2);
    expect(body.data.sets[0]).toEqual(expect.objectContaining({ setNumber: 1, weight: 100, reps: 10 }));
    expect(body.data.sets[1]).toEqual(expect.objectContaining({ setNumber: 2, weight: 95, reps: 8 }));
  });

  it('falls back to exercise name when exercise id has no previous logs', async () => {
    prismaMock.workoutLog.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: 'name-log-1',
        exerciseId: 'historic-exercise-id',
        loggedAt: new Date('2026-06-20T08:00:00.000Z'),
      });

    prismaMock.workoutLog.findMany.mockResolvedValueOnce([
      {
        id: 'historic-set-1',
        weight: 80,
        reps: 12,
        durationSeconds: null,
        distanceKm: null,
        notes: 'Set 1',
        loggedAt: new Date('2026-06-20T08:00:00.000Z'),
      },
    ]);

    const response = await GET(new Request('http://localhost/api/workouts/previous?exerciseId=current-id&exerciseName=Bench%20Press'));

    expect(response.status).toBe(200);
    expect(prismaMock.workoutLog.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ exerciseId: 'historic-exercise-id' }),
    }));
  });

  it('returns 404 when no previous workout exists', async () => {
    prismaMock.workoutLog.findFirst.mockResolvedValueOnce(null);

    const response = await GET(new Request('http://localhost/api/workouts/previous?exerciseId=exercise-1'));

    expect(response.status).toBe(404);
    expect(prismaMock.workoutLog.findMany).not.toHaveBeenCalled();
  });
});
