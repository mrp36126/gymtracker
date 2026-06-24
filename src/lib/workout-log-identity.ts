import type { Prisma } from '@prisma/client';

type WorkoutLogOwner = {
  id: string;
  email?: string | null;
};

export function buildWorkoutLogOwnerWhere(
  owner: WorkoutLogOwner,
  where: Omit<Prisma.WorkoutLogWhereInput, 'OR' | 'userId' | 'user'> = {},
): Prisma.WorkoutLogWhereInput {
  const email = owner.email?.trim();

  if (!email) {
    return {
      ...where,
      userId: owner.id,
    };
  }

  return {
    ...where,
    OR: [
      { userId: owner.id },
      { user: { email } },
    ],
  };
}