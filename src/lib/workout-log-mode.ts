export type WorkoutLogMode = 'timeDistance' | 'timeOnly' | 'weightDistance' | 'repsOnly' | 'strength';

function normalize(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
}

function includesAny(haystack: string, needles: string[]) {
  return needles.some((needle) => haystack.includes(needle));
}

export function getWorkoutLogMode(muscleGroup: string, exerciseName: string): WorkoutLogMode {
  const normalizedGroup = normalize(muscleGroup);
  const normalizedName = normalize(exerciseName);

  if (normalizedName === 'plank' || normalizedName === 'planks') {
    return 'timeOnly';
  }

  const cardioTokens = ['running', 'rowing', 'cycling', 'skierg'];
  if (
    includesAny(normalizedGroup, cardioTokens)
    || includesAny(normalizedName, cardioTokens)
  ) {
    return 'timeDistance';
  }

  if (includesAny(normalizedGroup, ['sledpush', 'sledpull', 'farmers'])) {
    return 'weightDistance';
  }

  if (normalizedGroup === 'burpee' || normalizedName.includes('burpee')) {
    return 'repsOnly';
  }

  return 'strength';
}
