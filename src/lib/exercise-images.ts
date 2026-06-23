import type { ExerciseCatalogItem } from '@/types';

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export function getExpectedExerciseImageNames(exercise: Pick<ExerciseCatalogItem, 'id' | 'exerciseName'>) {
  const base = slugify(exercise.exerciseName) || exercise.id;
  return {
    card: `${base}.jpg`,
    detail: `${base}-detail.jpg`,
  };
}

export function hasPendingCardImage(exercise: Pick<ExerciseCatalogItem, 'imageUrl'>) {
  return !exercise.imageUrl || exercise.imageUrl.trim().length === 0;
}
