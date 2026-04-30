import { getAuthUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import CsvUploader from '@/components/program/CsvUploader';

export default async function ProgramPage() {
  const user = await getAuthUser();
  if (!user) redirect('/login');

  const programs = await prisma.program.findMany({
    orderBy: { createdAt: 'desc' },
  });

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-indigo-700">Gym Programs</h1>
            <p className="text-gray-400 text-sm mt-1">
              {user.isAdmin ? 'Admin — manage all programs' : 'Your current workout program'}
            </p>
          </div>
          <Link href="/welcome" className="text-sm text-indigo-600 hover:underline">← Back</Link>
        </div>

        {/* Only admin sees the uploader */}
        {user.isAdmin && (
          <div className="mb-8">
            <CsvUploader />
          </div>
        )}

        {programs.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center border border-gray-100">
            <p className="text-gray-400">No programs loaded yet.</p>
            {user.isAdmin && <p className="text-sm text-gray-300 mt-1">Upload a CSV above to get started.</p>}
          </div>
        ) : (
          <div className="space-y-3">
            {programs.map(program => (
              <div key={program.id}
                className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex items-center justify-between">
                <div>
                  <p className="font-semibold text-gray-800">{program.name}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {program.isActive ? '✅ Active' : 'Inactive'} · Added {new Date(program.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex gap-2">
                  {/* Only admin can activate/delete */}
                  {user.isAdmin && !program.isActive && (
                    <form action={`/api/programs/${program.id}/activate`} method="POST">
                      <button type="submit"
                        className="text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700 transition">
                        Set Active
                      </button>
                    </form>
                  )}
                  <Link href={`/program/${program.id}`}
                    className="text-xs border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition text-gray-600">
                    View
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
