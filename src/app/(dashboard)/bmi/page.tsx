import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getAuthUser } from '@/lib/auth';
import BmiClient from '@/components/progress/BmiClient';

export default async function BmiPage() {
  const user = await getAuthUser();
  if (!user) redirect('/login');

  return (
    <main className="min-h-screen bg-[#0A0A0F] pb-8">
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/[0.06] bg-white/[0.03] px-6 py-4 backdrop-blur-xl">
        <Link href="/welcome" className="text-sm text-white/40 transition hover:text-white/70">← Home</Link>
        <p className="text-sm font-bold text-white">BMI</p>
        <div className="w-10"></div>
      </div>

      <BmiClient userId={user.id} userName={user.name} />
    </main>
  );
}
