import { getAuthUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import MediaManager from '@/components/admin/MediaManager';

export default async function AdminMediaPage() {
  const user = await getAuthUser();
  if (!user) redirect('/login');
  if (!user.isAdmin) redirect('/welcome');

  const programs = await prisma.program.findMany({
    where: { userId: user.id },
    include: {
      exercises: { orderBy: [{ day: 'asc' }, { order: 'asc' }] }
    },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <main className="min-h-screen bg-[#0A0A0F] pb-10">

      {/* Header */}
      <div className="bg-white/[0.03] border-b border-white/[0.06] px-6 py-4 flex items-center justify-between sticky top-0 backdrop-blur-xl z-10">
        <Link href="/admin" className="text-white/40 hover:text-white/70 transition text-sm">← Admin</Link>
        <p className="text-sm font-bold text-white">Exercise Media</p>
        <div className="w-10"></div>
      </div>

      <div className="max-w-2xl mx-auto px-5 pt-6">
        <p className="text-xs font-semibold tracking-widest text-white/30 uppercase mb-4">
          Upload images or videos for each exercise
        </p>
        <MediaManager programs={programs} />
      </div>
    </main>
  );
}
