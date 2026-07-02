import type { PreviousWorkoutReference } from '@/types';

type FetchPreviousWorkoutReferenceArgs = {
  exerciseId: string;
  exerciseName?: string;
  targetUserId?: string;
  signal?: AbortSignal;
};

export async function fetchPreviousWorkoutReference({
  exerciseId,
  exerciseName,
  targetUserId,
  signal,
}: FetchPreviousWorkoutReferenceArgs): Promise<PreviousWorkoutReference | null> {
  const params = new URLSearchParams({ exerciseId });

  if (exerciseName?.trim()) {
    params.set('exerciseName', exerciseName.trim());
  }

  if (targetUserId?.trim()) {
    params.set('targetUserId', targetUserId.trim());
  }

  const response = await fetch(`/api/workouts/previous?${params.toString()}`, {
    method: 'GET',
    signal,
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    const payload = await response.json().catch(() => null) as { error?: string } | null;
    throw new Error(payload?.error ?? 'Failed to load previous workout');
  }

  const payload = await response.json() as { data?: PreviousWorkoutReference };
  return payload.data ?? null;
}
