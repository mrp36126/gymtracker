import { beforeEach, describe, expect, it, vi } from 'vitest';

const trainerUser = { id: 'trainer-user', isAdmin: false, isTrainer: false, isTrainerUser: true };
const trainer = { id: 'trainer-1', isAdmin: false, isTrainer: true, isTrainerUser: false };

const prismaMock = vi.hoisted(() => ({
  program: {
    create: vi.fn(),
  },
  user: {
    findUnique: vi.fn(),
  },
}));

vi.mock('@/lib/auth', () => ({
  requireAuth: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: prismaMock,
}));

vi.mock('@/lib/exercise-catalog', () => ({
  loadExerciseCatalog: vi.fn(async () => [{
    id: 'ex-1',
    exerciseName: 'Bench Press',
    category: 'Chest',
    primaryMuscles: ['Chest'],
    secondaryMuscles: [],
    equipment: 'Barbell',
    difficulty: 'Intermediate',
    description: 'Desc',
    instructions: 'Instructions',
    imageUrl: 'https://example.com/image.jpg',
    detailImageUrl: 'https://example.com/detail.jpg',
  }]),
}));

vi.mock('@/lib/supabase', () => ({
  createSupabaseServerClient: vi.fn(async () => ({
    storage: {
      from: () => ({
        upload: vi.fn(),
        getPublicUrl: () => ({ data: { publicUrl: 'https://example.com/program.csv' } }),
      }),
    },
  })),
}));

import { requireAuth } from '@/lib/auth';
import { POST } from '@/app/api/programs/route';
import { PATCH as patchProgram } from '@/app/api/programs/[id]/route';

describe('program routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('allows a trainer to create a program from the exercise pool', async () => {
    vi.mocked(requireAuth).mockResolvedValueOnce({ user: trainer, response: null } as any);
    prismaMock.program.create.mockResolvedValue({
      id: 'program-1',
      name: 'Trainer Plan',
      exercises: [{ id: 'ex-1' }],
    });

    const response = await POST(new Request('http://localhost/api/programs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Trainer Plan',
        description: '',
        programType: 'primary',
        exercises: [{ exerciseId: 'ex-1', day: 'Monday', order: 1, sets: 3, reps: '10', notes: '' }],
      }),
    }));

    expect(response.status).toBe(201);
    expect(prismaMock.program.create).toHaveBeenCalled();
  });

  it('blocks trainer-users from editing programs', async () => {
    vi.mocked(requireAuth).mockResolvedValueOnce({ user: trainerUser, response: null } as any);

    const response = await patchProgram(new Request('http://localhost/api/programs/program-1', { method: 'PATCH' }), {
      params: Promise.resolve({ id: 'program-1' }),
    });

    expect(response.status).toBe(403);
  });

  it('blocks trainer CSV uploads', async () => {
    vi.mocked(requireAuth).mockResolvedValueOnce({ user: trainer, response: null } as any);

    const formData = new FormData();
    formData.append('name', 'CSV Plan');
    formData.append('file', new File(['a,b'], 'program.csv', { type: 'text/csv' }));

    const response = await POST(new Request('http://localhost/api/programs', {
      method: 'POST',
      body: formData,
    }));

    expect(response.status).toBe(403);
  });
});