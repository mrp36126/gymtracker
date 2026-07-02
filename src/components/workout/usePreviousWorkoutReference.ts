'use client';

import { useEffect, useState } from 'react';
import type { PreviousWorkoutReference } from '@/types';
import { fetchPreviousWorkoutReference } from '@/lib/workout-previous';

type UsePreviousWorkoutReferenceArgs = {
  exerciseId: string;
  exerciseName?: string;
  targetUserId?: string;
};

export function usePreviousWorkoutReference({
  exerciseId,
  exerciseName,
  targetUserId,
}: UsePreviousWorkoutReferenceArgs) {
  const [reference, setReference] = useState<PreviousWorkoutReference | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    const load = async () => {
      if (!exerciseId) {
        setReference(null);
        setError(null);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const data = await fetchPreviousWorkoutReference({
          exerciseId,
          exerciseName,
          targetUserId,
          signal: controller.signal,
        });
        setReference(data);
      } catch (err) {
        if (controller.signal.aborted) {
          return;
        }

        const message = err instanceof Error ? err.message : 'Failed to load previous workout';
        setReference(null);
        setError(message);
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    };

    load();

    return () => {
      controller.abort();
    };
  }, [exerciseId, exerciseName, targetUserId]);

  return {
    previousReference: reference,
    previousReferenceLoading: isLoading,
    previousReferenceError: error,
  };
}
