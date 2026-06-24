import { beforeEach, describe, expect, it, vi } from 'vitest';

const adminUser = { id: 'admin-1', email: 'admin@example.com', isAdmin: true, isTrainer: false, isTrainerUser: false };
const trainerUser = { id: 'trainer-1', email: 'trainer@example.com', isAdmin: false, isTrainer: true, isTrainerUser: false };

const prismaMock = vi.hoisted(() => ({
  user: {
    findUnique: vi.fn(),
  },
  workoutLog: {
    findMany: vi.fn(),
  },
}));

const requireAuthMock = vi.hoisted(() => vi.fn());

vi.mock('@/lib/auth', () => ({
  requireAuth: requireAuthMock,
}));

vi.mock('@/lib/prisma', () => ({
  prisma: prismaMock,
}));

vi.mock('@/lib/program-scope', () => ({
  findActivePrimaryProgramForUser: vi.fn(async () => ({ id: 'program-1' })),
  findExerciseForUser: vi.fn(async () => ({ id: 'exercise-1' })),
}));

import { GET } from '@/app/api/progress/route';

describe('progress route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('allows a trainer to fetch progress for an assigned user', async () => {
    requireAuthMock.mockResolvedValueOnce({ user: trainerUser, response: null });
    prismaMock.user.findUnique.mockResolvedValueOnce({ id: 'athlete-1', email: 'athlete@example.com', trainerId: 'trainer-1' });
    prismaMock.workoutLog.findMany.mockResolvedValueOnce([
      {
        loggedAt: new Date('2026-06-19T12:00:00Z'),
        weight: 100,
        sets: 3,
        reps: 8,
        exercise: { name: 'Bench Press', muscleGroup: 'Chest' },
      },
    ]);

    const response = await GET(new Request('http://localhost/api/progress?userId=athlete-1'));

    expect(response.status).toBe(200);
    expect(prismaMock.workoutLog.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        OR: [
          { userId: 'athlete-1' },
          { user: { email: 'athlete@example.com' } },
        ],
      },
    }));
  });

  it('blocks a trainer from viewing an unassigned users progress', async () => {
    requireAuthMock.mockResolvedValueOnce({ user: trainerUser, response: null });
    prismaMock.user.findUnique.mockResolvedValueOnce({ id: 'athlete-2', email: 'athlete2@example.com', trainerId: 'other-trainer' });

    const response = await GET(new Request('http://localhost/api/progress?userId=athlete-2'));

    expect(response.status).toBe(403);
    expect(prismaMock.workoutLog.findMany).not.toHaveBeenCalled();
  });

  it('allows an admin to fetch any users progress', async () => {
    requireAuthMock.mockResolvedValueOnce({ user: adminUser, response: null });
    prismaMock.user.findUnique.mockResolvedValueOnce({ id: 'athlete-3', email: 'athlete3@example.com', trainerId: 'other-trainer' });
    prismaMock.workoutLog.findMany.mockResolvedValueOnce([]);

    const response = await GET(new Request('http://localhost/api/progress?userId=athlete-3'));

    expect(response.status).toBe(200);
  });
});