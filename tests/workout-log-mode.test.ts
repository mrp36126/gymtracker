import { describe, expect, it } from 'vitest';
import { getWorkoutLogMode } from '@/lib/workout-log-mode';

describe('workout log mode resolver', () => {
  it('classifies running variants as time+distance', () => {
    expect(getWorkoutLogMode('cardio', 'Running')).toBe('timeDistance');
    expect(getWorkoutLogMode('cardio', 'Running 5k')).toBe('timeDistance');
    expect(getWorkoutLogMode('running', 'Interval Session')).toBe('timeDistance');
  });

  it('classifies plank as time-only', () => {
    expect(getWorkoutLogMode('core', 'Plank')).toBe('timeOnly');
  });

  it('classifies weighted distance exercises correctly', () => {
    expect(getWorkoutLogMode('Sled Push', 'Heavy Push')).toBe('weightDistance');
    expect(getWorkoutLogMode('farmers', 'Carry')).toBe('weightDistance');
  });

  it('classifies burpee variants as reps-only', () => {
    expect(getWorkoutLogMode('burpee', 'Burpee')).toBe('repsOnly');
    expect(getWorkoutLogMode('conditioning', 'Burpee Broad Jump')).toBe('repsOnly');
  });

  it('falls back to strength mode', () => {
    expect(getWorkoutLogMode('chest', 'Bench Press')).toBe('strength');
  });
});
