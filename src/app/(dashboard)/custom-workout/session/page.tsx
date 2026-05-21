import { redirect } from 'next/navigation';
import CustomWorkoutSession from '@/components/workout/CustomWorkoutSession';
import { getAuthUser } from '@/lib/auth';

export default async function CustomWorkoutSessionPage() {
  const user = await getAuthUser();
  if (!user) redirect('/login');

  return (
    <main className="min-h-screen bg-[#0A0A0F] pb-10">
      <CustomWorkoutSession />
    </main>
  );
}
