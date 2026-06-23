import { describe, expect, it } from 'vitest';
import {
  getWorkoutExerciseCardKey,
  getWorkoutSessionManagerKey,
} from '@/lib/workout-session-keys';

describe('workout session key isolation', () => {
  it('builds distinct manager keys for different trainees in the same program/day', () => {
    const traineeOneKey = getWorkoutSessionManagerKey('trainee-1', 'program-1', 'Monday');
    const traineeTwoKey = getWorkoutSessionManagerKey('trainee-2', 'program-1', 'Monday');

    expect(traineeOneKey).not.toBe(traineeTwoKey);
  });

  it('builds distinct exercise card keys for different trainees on the same exercise', () => {
    const traineeOneCardKey = getWorkoutExerciseCardKey('trainee-1', 'exercise-1');
    const traineeTwoCardKey = getWorkoutExerciseCardKey('trainee-2', 'exercise-1');

    expect(traineeOneCardKey).not.toBe(traineeTwoCardKey);
  });

  it('keeps keys stable for the same trainee context', () => {
    const first = getWorkoutSessionManagerKey('trainee-1', 'program-1', 'Tuesday');
    const second = getWorkoutSessionManagerKey('trainee-1', 'program-1', 'Tuesday');

    expect(first).toBe(second);
  });
});
