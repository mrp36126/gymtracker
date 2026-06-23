export function getWorkoutSessionManagerKey(targetUserId: string, programId: string, day: string) {
  return `${targetUserId}:${programId}:${day}`;
}

export function getWorkoutExerciseCardKey(targetUserId: string, exerciseId: string) {
  return `${targetUserId}:${exerciseId}`;
}