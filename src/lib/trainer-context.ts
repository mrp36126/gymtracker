import { prisma } from './prisma';
import type { AppUser } from './rbac';

type Viewer = Pick<AppUser, 'id' | 'isAdmin' | 'isTrainer'>;

export type ManagedTargetUser = {
  id: string;
  name?: string;
  email?: string;
  trainerId?: string | null;
  isAdmin?: boolean;
  isTrainer?: boolean;
  isTrainerUser?: boolean;
};

export async function resolveManagedTargetUser(
  viewer: Viewer,
  requestedUserId?: string | null,
): Promise<ManagedTargetUser | null> {
  const targetUserId = requestedUserId?.trim();

  if (!targetUserId || targetUserId === viewer.id) {
    return {
      id: viewer.id,
      isAdmin: viewer.isAdmin,
      isTrainer: viewer.isTrainer,
    };
  }

  const targetUser = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: {
      id: true,
      name: true,
      email: true,
      trainerId: true,
      isAdmin: true,
      isTrainer: true,
      isTrainerUser: true,
    },
  });

  if (!targetUser) {
    return null;
  }

  if (viewer.isAdmin) {
    return targetUser;
  }

  if (viewer.isTrainer && targetUser.trainerId === viewer.id) {
    return targetUser;
  }

  return null;
}