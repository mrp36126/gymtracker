import { describe, expect, it } from 'vitest';
import { canUseCustomWorkout, canViewUserProgress } from '@/lib/rbac';
import { canManageProgram, canViewProgram } from '@/lib/program-scope';

describe('RBAC helpers', () => {
  const admin = { id: 'admin', isAdmin: true, isTrainer: false, isTrainerUser: false };
  const trainer = { id: 'trainer', isAdmin: false, isTrainer: true, isTrainerUser: false };
  const trainerUser = { id: 'athlete', isAdmin: false, isTrainer: false, isTrainerUser: true };
  const individual = { id: 'user', isAdmin: false, isTrainer: false, isTrainerUser: false };

  it('allows trainers, admins, and individual users to use custom workouts while trainer-users remain read-only', () => {
    expect(canUseCustomWorkout(admin)).toBe(true);
    expect(canUseCustomWorkout(individual)).toBe(true);
    expect(canUseCustomWorkout(trainer)).toBe(true);
    expect(canUseCustomWorkout(trainerUser)).toBe(false);
  });

  it('allows trainers to view and manage their own and assigned programs', () => {
    const ownedProgram = { id: 'trainer', trainerId: null };
    const assignedProgram = { id: 'program-user', trainerId: 'trainer' };
    const foreignProgram = { id: 'program-other', trainerId: 'other-trainer' };

    expect(canViewProgram(admin, ownedProgram)).toBe(true);
    expect(canManageProgram(admin, ownedProgram)).toBe(true);

    expect(canViewProgram(trainer, ownedProgram)).toBe(true);
    expect(canManageProgram(trainer, ownedProgram)).toBe(true);

    expect(canViewProgram(trainer, assignedProgram)).toBe(true);
    expect(canManageProgram(trainer, assignedProgram)).toBe(true);

    expect(canViewProgram(trainer, foreignProgram)).toBe(false);
    expect(canManageProgram(trainer, foreignProgram)).toBe(false);

    expect(canViewProgram(trainerUser, { id: 'athlete', trainerId: null })).toBe(true);
  });

  it('allows trainers to view progress only for themselves or assigned users', () => {
    expect(canViewUserProgress(trainer, { id: 'athlete', trainerId: 'trainer' })).toBe(true);
    expect(canViewUserProgress(trainer, { id: 'other', trainerId: 'other-trainer' })).toBe(false);
    expect(canViewUserProgress(trainerUser, { id: 'athlete', trainerId: 'trainer' })).toBe(true);
    expect(canViewUserProgress(trainerUser, { id: 'other', trainerId: 'trainer' })).toBe(false);
  });
});