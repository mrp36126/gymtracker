import Link from 'next/link';
import { redirect } from 'next/navigation';
import CustomWorkoutBuilder from '@/components/workout/CustomWorkoutBuilder';
import { getAuthUser } from '@/lib/auth';
import { loadExerciseCatalog } from '@/lib/exercise-catalog';
import type { ExerciseCatalogItem } from '@/types';
import { canUseCustomWorkout } from '@/lib/rbac';

export default async function CustomWorkoutPage() {
  const user = await getAuthUser();
  if (!user) redirect('/login');
  if (!canUseCustomWorkout(user)) redirect('/welcome');

  let exercises: ExerciseCatalogItem[] = [];
  let error = '';

  try {
    exercises = await loadExerciseCatalog();
  } catch (err: any) {
    error = err.message || 'Unable to load exercises.';
  }

  return (
    <main className="min-h-screen bg-[#0A0A0F] pb-12">
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/[0.06] bg-white/[0.03] px-6 py-4 backdrop-blur-xl">
        <Link href="/welcome" className="text-sm text-white/40 transition hover:text-white/70">&lt;- Home</Link>
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-white/30">Custom Session</p>
          <p className="text-sm font-bold text-white">Build Today's Workout</p>
        </div>
        <div className="w-12" />
      </div>

      <div className="mx-auto w-full max-w-6xl px-4 pt-6 sm:px-6">
        <div className="mb-6">
          <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-indigo-400">Your workout, your call</p>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">I Want To Do My Own Program Today</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-white/45">
            Search the exercise catalog, add movements one at a time, and arrange today's session in the order you want to train.
          </p>
        </div>

        {error ? (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-6">
            <p className="font-semibold text-red-300">Could not load exercise catalog</p>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-red-200/70">{error}</p>
          </div>
        ) : (
          <CustomWorkoutBuilder exercises={exercises} />
        )}
      </div>
    </main>
  );
}
