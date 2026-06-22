import { redirect } from 'next/navigation';
import { getAuthUser } from '@/lib/auth';
import { canUseCustomWorkout } from '@/lib/rbac';
import { getTodayName } from '@/lib/day-resolver';

export default async function CustomWorkoutSessionPage() {
  const user = await getAuthUser();
  if (!user) redirect('/login');
  if (!canUseCustomWorkout(user)) redirect('/welcome');

  const todayName = getTodayName();
  redirect(`/workout/${todayName.toLowerCase()}`);
}
