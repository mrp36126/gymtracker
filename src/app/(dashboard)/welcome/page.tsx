import { getAuthUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getTodayName } from '@/lib/day-resolver';
import Link from 'next/link';
import { redirect } from 'next/navigation';

export default async function WelcomePage() {
  let user;
  try {
    user = await getAuthUser();
  } catch (err: any) {
    return (
      <main className="min-h-screen flex items-center justify-center p-8">
        <div className="bg-red-50 rounded-2xl p-6 max-w-lg">
          <h2 className="font-bold text-red-700 mb-2">Database connection error</h2>
          <p className="text-red-600 text-sm">{err.message}</p>
        </div>
      </main>
    );
  }

  if (!user) redirect('/login');

  const todayName = getTodayName();

  // Get the active primary program
  let activeProgram = null;
  let supplementaryPrograms: any[] = [];

  try {
    activeProgram = await prisma.program.findFirst({
      where: { isActive: true, programType: 'primary' },
    });

    // Get all active supplementary programs
    supplementaryPrograms = await prisma.program.findMany({
      where: { isActive: true, programType: 'supplementary' },
      orderBy: { name: 'asc' },
    });
  } catch (err) {
    // continue
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-indigo-700 mb-1">
            Hello, {user.name}
          </h1>
          <p className="text-gray-500">
            Today is <span className="font-semibold text-indigo-600">{todayName}</span>.
            {activeProgram ? ` Active program: "${activeProgram.name}".` : ''}
          </p>
        </div>

        {/* Today's primary workout */}
        <div className="mb-4">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
            Today&apos;s Workout
          </p>
          {activeProgram ? (
            <Link
              href={'/workout/' + todayName.toLowerCase()}
              className="block bg-indigo-600 text-white rounded-2xl p-6 hover:bg-indigo-700 transition">
              <p className="text-sm uppercase tracking-wider opacity-75 mb-1">Primary Program</p>
              <p className="text-2xl font-bold">{todayName} Session</p>
              <p className="text-sm opacity-75 mt-1">{activeProgram.name}</p>
            </Link>
          ) : (
            <div className="bg-white rounded-2xl p-6 border border-dashed border-indigo-200 text-center">
              <p className="text-gray-400">No active program.</p>
              {user.isAdmin && (
                <Link href="/admin" className="text-indigo-600 text-sm mt-1 inline-block hover:underline">
                  Go to Admin to activate one
                </Link>
              )}
            </div>
          )}
        </div>

        {/* Supplementary programs */}
        {supplementaryPrograms.length > 0 && (
          <div className="mb-4">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
              Additional Programs
            </p>
            <div className="space-y-3">
              {supplementaryPrograms.map(prog => (
                <Link
                  key={prog.id}
                  href={'/supplementary/' + prog.id}
                  className="block bg-white border border-indigo-200 rounded-2xl p-5 hover:shadow-md transition">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-gray-800">{prog.name}</p>
                      {prog.description && (
                        <p className="text-sm text-gray-400 mt-0.5">{prog.description}</p>
                      )}
                    </div>
                    <span className="text-indigo-600 font-bold text-lg">→</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Bottom row */}
        <div className="grid grid-cols-2 gap-4 mt-4">
          <Link href="/progress"
            className="block bg-white border border-indigo-200 rounded-2xl p-5 hover:shadow-md transition">
            <p className="text-xs uppercase tracking-wider text-gray-400 mb-1">Progress</p>
            <p className="text-xl font-bold text-indigo-700">View Charts</p>
          </Link>

          {user.isAdmin && (
            <Link href="/admin"
              className="block bg-white border border-indigo-200 rounded-2xl p-5 hover:shadow-md transition">
              <p className="text-xs uppercase tracking-wider text-gray-400 mb-1">Admin</p>
              <p className="text-xl font-bold text-indigo-700">Manage</p>
            </Link>
          )}
        </div>
      </div>
    </main>
  );
}
