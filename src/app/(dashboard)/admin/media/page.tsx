import { getAuthUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import MediaManager from '@/components/admin/MediaManager';

export default async function AdminMediaPage() {
  const user = await getAuthUser();
  if (!user) redirect('/login');
  if (!user.isAdmin) redirect('/welcome');

  const programs = await prisma.program.findMany({
    include: {
      exercises: { orderBy: [{ day: 'asc' }, { order: 'asc' }] }
    },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-indigo-700">Exercise Media</h1>
            <p className="text-gray-400 text-sm mt-1">Upload images or videos for each exercise</p>
          </div>
          <a href="/welcome" className="text-sm text-indigo-600 hover:underline">← Back</a>
        </div>
        <MediaManager programs={programs} />
      </div>
    </main>
  );
}
