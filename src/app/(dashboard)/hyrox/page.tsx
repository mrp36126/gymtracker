import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getAuthUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export default async function HyroxPage() {
  const user = await getAuthUser();
  if (!user) redirect('/login');
  if (user.isTrainerUser) redirect('/welcome');

  const supplementaryPrograms = await prisma.program.findMany({
    where: { isActive: true, programType: 'supplementary', userId: user.id },
    orderBy: { name: 'asc' },
  });

  const hyroxProgram = supplementaryPrograms.find((program) =>
    program.name.toLowerCase().includes('hyrox')
  );

  if (hyroxProgram) redirect('/supplementary/' + hyroxProgram.id);

  return (
    <main className="min-h-screen bg-[#0A0A0F] p-6">
      <div className="mx-auto max-w-lg">
        <Link href="/welcome" className="mb-8 inline-block text-sm text-white/40 transition hover:text-white/70">
          &lt;- Home
        </Link>

        <div className="rounded-2xl border border-purple-500/20 bg-purple-500/[0.06] p-7">
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-purple-300/70">Hyrox</p>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">Hyrox is not active yet</h1>
          <p className="mt-3 text-sm leading-6 text-white/50">
            Upload or activate a supplementary program with &quot;Hyrox&quot; in its name from the admin area, and this option will open it automatically.
          </p>

          {user.isAdmin && (
            <Link
              href="/admin"
              className="mt-5 inline-flex rounded-xl bg-purple-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-purple-500"
            >
              Manage Programs
            </Link>
          )}
        </div>
      </div>
    </main>
  );
}
