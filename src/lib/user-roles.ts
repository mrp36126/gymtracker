export type UserRoleInput = {
  isAdmin?: boolean;
  isTrainer?: boolean;
  isTrainerUser?: boolean;
};

export type UserRoleFlags = {
  isAdmin: boolean;
  isTrainer: boolean;
  isTrainerUser: boolean;
};

export const DEFAULT_NEW_USER_ROLE: UserRoleFlags = {
  isAdmin: false,
  isTrainer: false,
  isTrainerUser: true,
};

export function resolveUserRoleFlags(input?: UserRoleInput): UserRoleFlags {
  const hasExplicitRole =
    input?.isAdmin !== undefined
    || input?.isTrainer !== undefined
    || input?.isTrainerUser !== undefined;

  if (!hasExplicitRole) {
    return { ...DEFAULT_NEW_USER_ROLE };
  }

  return {
    isAdmin: input?.isAdmin ?? false,
    isTrainer: input?.isTrainer ?? false,
    isTrainerUser: input?.isTrainerUser ?? false,
  };
}