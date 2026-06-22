import { beforeEach, describe, expect, it, vi } from 'vitest';

const trainerUser = { id: 'trainer-1', isAdmin: false, isTrainer: true, isTrainerUser: false };

const prismaMock = vi.hoisted(() => ({
  user: {
    findUnique: vi.fn(),
  },
  program: {
    findFirst: vi.fn(),
  },
  exercise: {
    findFirst: vi.fn(),
  },
  workoutLog: {
    create: vi.fn(),
  },
}));

const requireAuthMock = vi.hoisted(() => vi.fn());
const findActivePrimaryProgramForUserMock = vi.hoisted(() => vi.fn());
const findExerciseForUserMock = vi.hoisted(() => vi.fn());

vi.mock('@/lib/auth', () => ({
  requireAuth: requireAuthMock,
}));

vi.mock('@/lib/prisma', () => ({
  prisma: prismaMock,
}));

vi.mock('@/lib/program-scope', () => ({
  findActivePrimaryProgramForUser: findActivePrimaryProgramForUserMock,
  findExerciseForUser: findExerciseForUserMock,
}));

import { POST } from '@/app/api/workouts/sets/route';

describe('workout sets route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireAuthMock.mockResolvedValue({ user: trainerUser, response: null });
    findActivePrimaryProgramForUserMock.mockResolvedValue({ id: 'program-1' });
    findExerciseForUserMock.mockResolvedValue({ id: 'exercise-1', muscleGroup: 'Chest', name: 'Bench Press' });
    prismaMock.program.findFirst.mockResolvedValue({ id: 'program-1' });
    prismaMock.exercise.findFirst.mockResolvedValue({ id: 'exercise-1', muscleGroup: 'Chest', name: 'Bench Press' });
    prismaMock.workoutLog.create.mockResolvedValue({ id: 'log-1' });
  });

  it('blocks logging a set when the target user is a trainer user', async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce({
      id: 'cmcuid000000000000000099',
      trainerId: 'trainer-1',
      isTrainerUser: true,
      isAdmin: false,
      isTrainer: false,
    });

    const response = await POST(new Request('http://localhost/api/workouts/sets', {
      method: 'POST',
      body: JSON.stringify({
        exerciseId: 'cmcuid000000000000000001',
        setNumber: 1,
        weight: 100,
        reps: 8,
        targetUserId: 'cmcuid000000000000000099',
      }),
      headers: { 'Content-Type': 'application/json' },
    }));

    expect(response.status).toBe(403);
    expect(prismaMock.workoutLog.create).not.toHaveBeenCalled();
  });

  it('allows logging a set when the target user is an individual user', async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce({
      id: 'cmcuid000000000000000101',
      trainerId: 'trainer-1',
      isTrainerUser: false,
      isAdmin: false,
      isTrainer: false,
    });

    const response = await POST(new Request('http://localhost/api/workouts/sets', {
      method: 'POST',
      body: JSON.stringify({
        exerciseId: 'cmcuid000000000000000001',
        setNumber: 1,
        weight: 100,
        reps: 8,
        targetUserId: 'cmcuid000000000000000101',
      }),
      headers: { 'Content-Type': 'application/json' },
    }));

    expect(response.status).toBe(201);
    expect(prismaMock.workoutLog.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ userId: 'cmcuid000000000000000101' }),
    }));
  });

  it('blocks a trainer from logging a set for an unassigned user', async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce({
      id: 'cmcuid000000000000000100',
      trainerId: 'other-trainer',
      isTrainerUser: true,
      isAdmin: false,
      isTrainer: false,
    });

    const response = await POST(new Request('http://localhost/api/workouts/sets', {
      method: 'POST',
      body: JSON.stringify({
        exerciseId: 'cmcuid000000000000000001',
        setNumber: 1,
        weight: 100,
        reps: 8,
        targetUserId: 'cmcuid000000000000000100',
      }),
      headers: { 'Content-Type': 'application/json' },
    }));

    expect(response.status).toBe(403);
    expect(prismaMock.workoutLog.create).not.toHaveBeenCalled();
  });
});