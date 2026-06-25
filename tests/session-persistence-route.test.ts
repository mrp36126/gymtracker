import { beforeEach, describe, expect, it, vi } from 'vitest';

const txMock = vi.hoisted(() => ({
  program: {
    updateMany: vi.fn(),
    deleteMany: vi.fn(),
    create: vi.fn(),
  },
}));

const prismaMock = vi.hoisted(() => ({
  $transaction: vi.fn((callback: (tx: typeof txMock) => unknown) => callback(txMock)),
}));

const requireAuthMock = vi.hoisted(() => vi.fn());
const loadExerciseCatalogMock = vi.hoisted(() => vi.fn());
const resolveManagedTargetUserMock = vi.hoisted(() => vi.fn());

vi.mock('@/lib/auth', () => ({
  requireAuth: requireAuthMock,
}));

vi.mock('@/lib/prisma', () => ({
  prisma: prismaMock,
}));

vi.mock('@/lib/exercise-catalog', () => ({
  loadExerciseCatalog: loadExerciseCatalogMock,
}));

vi.mock('@/lib/trainer-context', () => ({
  resolveManagedTargetUser: resolveManagedTargetUserMock,
}));

import { POST as createCustomSession } from '@/app/api/custom-workout/session/route';
import { POST as createTrainerSession } from '@/app/api/trainer/sessions/route';

const catalogExercise = {
  id: 'ex001',
  exerciseName: 'Bench Press',
  category: 'Chest',
  instructions: 'Press the bar.',
  imageUrl: null,
  detailImageUrl: null,
};

describe('session creation persistence', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    loadExerciseCatalogMock.mockResolvedValue([catalogExercise]);
    txMock.program.updateMany.mockResolvedValue({ count: 1 });
    txMock.program.create.mockResolvedValue({
      id: 'program-1',
      userId: 'user-1',
      _count: { exercises: 1 },
    });
  });

  it('starts a custom workout without deleting earlier custom programs and their logs', async () => {
    requireAuthMock.mockResolvedValue({
      user: { id: 'user-1', isTrainerUser: false },
      response: null,
    });

    const response = await createCustomSession(new Request('http://localhost/api/custom-workout/session', {
      method: 'POST',
      body: JSON.stringify({
        exercises: [{ exerciseId: 'ex001', sets: 3, reps: '8' }],
      }),
      headers: { 'Content-Type': 'application/json' },
    }));

    expect(response.status).toBe(201);
    expect(txMock.program.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      data: { isActive: false },
    }));
    expect(txMock.program.create).toHaveBeenCalled();
    expect(txMock.program.deleteMany).not.toHaveBeenCalled();
  });

  it('starts a trainer-loaded session without deleting earlier trainer session logs', async () => {
    requireAuthMock.mockResolvedValue({
      user: { id: 'trainer-1', isAdmin: false, isTrainer: true, isTrainerUser: false },
      response: null,
    });
    resolveManagedTargetUserMock.mockResolvedValue({
      id: 'trainee-1',
      trainerId: 'trainer-1',
      isTrainerUser: true,
    });

    const response = await createTrainerSession(new Request('http://localhost/api/trainer/sessions', {
      method: 'POST',
      body: JSON.stringify({
        targetUserIds: ['cmcuid000000000000000099'],
        exercises: [{ exerciseId: 'ex001', sets: 3, reps: '8' }],
      }),
      headers: { 'Content-Type': 'application/json' },
    }));

    expect(response.status).toBe(201);
    expect(txMock.program.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      data: { isActive: false },
    }));
    expect(txMock.program.create).toHaveBeenCalled();
    expect(txMock.program.deleteMany).not.toHaveBeenCalled();
  });
});
