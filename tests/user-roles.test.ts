import { describe, expect, it } from 'vitest';
import { resolveUserRoleFlags } from '@/lib/user-roles';

describe('resolveUserRoleFlags', () => {
  it('defaults to Trainer User when no role input is provided', () => {
    expect(resolveUserRoleFlags()).toEqual({
      isAdmin: false,
      isTrainer: false,
      isTrainerUser: true,
    });
  });

  it('preserves explicit role input and normalizes omitted flags to false', () => {
    expect(resolveUserRoleFlags({ isAdmin: true })).toEqual({
      isAdmin: true,
      isTrainer: false,
      isTrainerUser: false,
    });

    expect(resolveUserRoleFlags({ isTrainer: true })).toEqual({
      isAdmin: false,
      isTrainer: true,
      isTrainerUser: false,
    });

    expect(resolveUserRoleFlags({ isTrainerUser: true })).toEqual({
      isAdmin: false,
      isTrainer: false,
      isTrainerUser: true,
    });
  });
});
