import type { User } from '@/types';

export type AppUser = User & {
  trainerId?: string | null;
};

export function isAdmin(user: Pick<AppUser, 'isAdmin'> | null | undefined) {
  return Boolean(user?.isAdmin);
}

export function isTrainer(user: Pick<AppUser, 'isTrainer'> | null | undefined) {
  return Boolean(user?.isTrainer);
}

export function isTrainerUser(user: Pick<AppUser, 'isTrainerUser'> | null | undefined) {
  return Boolean(user?.isTrainerUser);
}

export function isIndividualUser(user: Pick<AppUser, 'isAdmin' | 'isTrainer' | 'isTrainerUser'> | null | undefined) {
  return Boolean(user) && !user.isAdmin && !user.isTrainer && !user.isTrainerUser;
}

export function canAccessAdminArea(user: Pick<AppUser, 'isAdmin' | 'isTrainer'> | null | undefined) {
  return isAdmin(user) || isTrainer(user);
}

export function canManagePrograms(user: Pick<AppUser, 'isAdmin' | 'isTrainer'> | null | undefined) {
  return isAdmin(user) || isTrainer(user);
}

export function canViewReadOnlyDashboard(user: Pick<AppUser, 'isAdmin' | 'isTrainer' | 'isTrainerUser'> | null | undefined) {
  return Boolean(user);
}

export function canUseCustomWorkout(user: Pick<AppUser, 'isAdmin' | 'isTrainer' | 'isTrainerUser'> | null | undefined) {
  return Boolean(user) && !isTrainer(user) && !isTrainerUser(user);
}

export function canAccessTrainerAssignedUsers(user: Pick<AppUser, 'isAdmin' | 'isTrainer'> | null | undefined) {
  return isAdmin(user) || isTrainer(user);
}

export function canViewUserProgress(
  viewer: Pick<AppUser, 'id' | 'isAdmin' | 'isTrainer' | 'isTrainerUser'> | null | undefined,
  target: Pick<AppUser, 'id' | 'trainerId'> | null | undefined,
) {
  if (!viewer || !target) return false;
  if (viewer.isAdmin) return true;
  if (viewer.id === target.id) return true;
  return viewer.isTrainer && target.trainerId === viewer.id;
}
