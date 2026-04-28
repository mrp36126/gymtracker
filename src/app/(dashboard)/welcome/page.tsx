// src/app/(dashboard)/welcome/page.tsx
import { getAuthUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getTodayName } from '@/lib/day-resolver';
import Link from 'next/link';
import { redirect } from 'next/navigation';

export default async function WelcomePage() {
  const user = await getAuthUser();
  if (!user) redirect('/login');

  const activeProgram = await prisma.program.findFirst({
    where: { userId: user.id, isActive: true },
  });

  const todayName = getTodayName();

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-4xl font-bold text-indigo-700 mb-2">
          Hello, {user.name} 👋
        </h1>
        <p className="text-gray-500 mb-8">
          Today is <span className="font-semibold text-indigo-600">{todayName}</span>.
          {activeProgram ? ` Your active program is "${activeProgram.name}".` : ''}
        </p>

        <div className="grid gap-4 md:grid-cols-2">
          {activeProgram ? (
            <Link href={`/workout/${todayName.toLowerCase()}`}
              className="block bg-indigo-600 text-white rounded-2xl p-6 hover:bg-indigo-700 transition">
              <p className="text-sm uppercase tracking-wider mb-1">Today's Workout</p>
              <p className="text-2xl font-bold">{todayName} Session →</p>
            </Link>
          ) : (
            <Link href="/program"
              className="block bg-indigo-600 text-white rounded-2xl p-6 hover:bg-indigo-700 transition">
              <p className="text-2xl font-bold">Upload a Program →</p>
              <p className="text-sm opacity-80 mt-1">No active program yet. Load your CSV.</p>
            </Link>
          )}

          <Link href="/progress"
            className="block bg-white border border-indigo-200 rounded-2xl p-6 hover:shadow-md transition">
            <p className="text-sm uppercase tracking-wider text-gray-400 mb-1">Progress</p>
            <p className="text-2xl font-bold text-indigo-700">View Charts →</p>
          </Link>
        </div>
      </div>
    </main>
  );
}
