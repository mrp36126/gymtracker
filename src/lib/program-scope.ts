import { prisma } from './prisma';
import type { AppUser } from './rbac';

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

export function findActivePrimaryProgramForUser(userId: string) {
  return prisma.program.findFirst({
    where: { userId, isActive: true, programType: 'primary' },
  });
}

export function canViewProgram(user: Pick<AppUser, 'id' | 'isAdmin' | 'isTrainer' | 'isTrainerUser'>, owner: Pick<AppUser, 'id' | 'trainerId'>) {
  if (user.isAdmin) return true;
  if (user.id === owner.id) return true;
  return user.isTrainer && owner.trainerId === user.id;
}

export function canManageProgram(user: Pick<AppUser, 'id' | 'isAdmin' | 'isTrainer' | 'isTrainerUser'>, owner: Pick<AppUser, 'id' | 'trainerId'>) {
  if (user.isAdmin) return true;
  if (!user.isTrainer) return false;
  return user.id === owner.id || owner.trainerId === user.id;
}
