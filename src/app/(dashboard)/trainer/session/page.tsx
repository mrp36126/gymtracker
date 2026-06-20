import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getAuthUser } from '@/lib/auth';
import { getTodayName } from '@/lib/day-resolver';
import { loadExerciseCatalog } from '@/lib/exercise-catalog';
import { resolveManagedTargetUser } from '@/lib/trainer-context';
import { isAdmin, isTrainer } from '@/lib/rbac';
import TrainerSessionBuilder from '@/components/trainer/TrainerSessionBuilder';

export default async function TrainerSessionPage({ searchParams }: { searchParams?: Promise<{ userId?: string }> }) {
  const user = await getAuthUser();
  if (!user) redirect('/login');
  if (!isTrainer(user) && !isAdmin(user)) redirect('/welcome');

  const params = searchParams ? await searchParams : {};
  const targetUser = await resolveManagedTargetUser(user, params.userId);

  if (!targetUser || !targetUser.isTrainerUser) {
    redirect('/welcome');
  }

  const todayName = getTodayName();
  const exercises = await loadExerciseCatalog();

  return (
    <main className="min-h-screen bg-[#0A0A0F] pb-10">
      <div className="bg-white/[0.03] border-b border-white/[0.06] px-6 py-4 flex items-center justify-between sticky top-0 backdrop-blur-xl z-10">
        <Link href="/welcome" className="text-white/40 hover:text-white/70 transition text-sm">← Home</Link>
        <p className="text-sm font-bold text-white">Load Trainer Session</p>
        <div className="w-10"></div>
      </div>

      <div className="max-w-6xl mx-auto px-4 pt-6 w-full">
        <TrainerSessionBuilder
          targetUserId={targetUser.id}
          targetUserName={targetUser.name ?? 'Trainer User'}
          todayName={todayName}
          exercises={exercises}
        />
      </div>
    </main>
  );
}