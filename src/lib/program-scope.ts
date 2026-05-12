import { prisma } from './prisma';

export function findProgramForUser(programId: string, userId: string) {
  return prisma.program.findFirst({
    where: { id: programId, userId },
  });
}

export function findExerciseForUser(exerciseId: string, userId: string) {
  return prisma.exercise.findFirst({
    where: { id: exerciseId, program: { userId } },
  });
}
