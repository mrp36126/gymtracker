import { getAuthUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import AdminProgramManager from '@/components/admin/AdminProgramManager';

export default async function AdminPage() {
  const user = await getAuthUser();
  if (!user) redirect('/login');
  if (!user.isAdmin) redirect('/welcome');

  const programs = await prisma.program.findMany({
    include: { _count: { select: { exercises: true } } },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-indigo-700">Admin Panel</h1>
            <p className="text-gray-400 text-sm mt-1">Manage programs, exercises and media</p>
          </div>
          <Link href="/welcome" className="text-sm text-indigo-600 hover:underline">← Home</Link>
        </div>

        {/* Quick links */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <Link href="/admin/media"
            className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition">
            <p className="text-2xl mb-1">🎬</p>
            <p className="font-bold text-gray-800">Exercise Media</p>
            <p className="text-xs text-gray-400 mt-1">Upload images & videos</p>
          </Link>
          <Link href="/program"
            className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition">
            <p className="text-2xl mb-1">📋</p>
            <p className="font-bold text-gray-800">View Programs</p>
            <p className="text-xs text-gray-400 mt-1">See user-facing program view</p>
          </Link>
        </div>

        <AdminProgramManager programs={programs} />
      </div>
    </main>
  );
}
