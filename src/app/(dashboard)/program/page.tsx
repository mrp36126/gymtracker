import { getAuthUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import CsvUploader from '@/components/program/CsvUploader';

export default async function ProgramPage() {
  const user = await getAuthUser();
  if (!user) redirect('/login');

  const programs = await prisma.program.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <main className="min-h-screen bg-[#0A0A0F] pb-10">

      {/* Header */}
      <div className="bg-white/[0.03] border-b border-white/[0.06] px-6 py-4 flex items-center justify-between sticky top-0 backdrop-blur-xl z-10">
        <Link href="/welcome" className="text-white/40 hover:text-white/70 transition text-sm">← Home</Link>
        <p className="text-sm font-bold text-white">Programs</p>
        <div className="w-10"></div>
      </div>

      <div className="max-w-lg mx-auto px-5 pt-6">

        {user.isAdmin && (
          <div className="mb-6">
            <p className="text-xs font-semibold tracking-widest text-white/30 uppercase mb-3">Upload New Program</p>
            <CsvUploader />
          </div>
        )}

        <p className="text-xs font-semibold tracking-widest text-white/30 uppercase mb-3">All Programs</p>

        {programs.length === 0 ? (
          <div className="bg-white/[0.04] border border-white/[0.06] rounded-2xl p-10 text-center">
            <p className="text-white/40 text-sm">No programs yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {programs.map(program => (
              <div key={program.id} className="bg-white/[0.04] border border-white/[0.06] rounded-2xl p-5 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-bold text-white text-sm">{program.name}</p>
                    {program.isActive && (
                      <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                        Active
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-white/30 uppercase tracking-widest">
                    Added {new Date(program.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex gap-2">
                  {user.isAdmin && !program.isActive && (
                    <form action={'/api/programs/' + program.id + '/activate'} method="POST">
                      <button type="submit"
                        className="text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-xl hover:bg-indigo-500 transition font-semibold">
                        Activate
                      </button>
                    </form>
                  )}
                  <Link href={'/program/' + program.id}
                    className="text-xs bg-white/[0.06] text-white/60 px-3 py-1.5 rounded-xl hover:bg-white/10 hover:text-white transition font-semibold border border-white/[0.08]">
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
