import { getAuthUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import AdminProgramManager from '@/components/admin/AdminProgramManager';
import { loadExerciseCatalog } from '@/lib/exercise-catalog';

export default async function AdminPage() {
  const user = await getAuthUser();
  if (!user) redirect('/login');
  if (!user.isAdmin) redirect('/welcome');

  const programs = await prisma.program.findMany({
    where: { userId: user.id },
    include: { _count: { select: { exercises: true } } },
    orderBy: { createdAt: 'desc' },
  });

  const assignedPrograms = await prisma.program.findMany({
    where: {
      userId: { not: user.id },
      isActive: true,
    },
    select: {
      name: true,
      programType: true,
      user: {
        select: { id: true, name: true, email: true },
      },
    },
    orderBy: [{ name: 'asc' }, { user: { name: 'asc' } }],
  });

  const programsWithAssignments = programs.map(program => ({
    ...program,
    assignedUsers: assignedPrograms
      .filter(assignedProgram =>
        assignedProgram.name === program.name
        && assignedProgram.programType === program.programType
      )
      .map(assignedProgram => assignedProgram.user),
  }));

  const users = await prisma.user.findMany({
    where: { id: { not: user.id } },
    select: { id: true, name: true, email: true, isAdmin: true, isTrainer: true, isTrainerUser: true },
    orderBy: [{ name: 'asc' }, { email: 'asc' }],
  });

  const waitingUsers = await prisma.user.findMany({
    where: {
      id: { not: user.id },
      programs: {
        none: {
          isActive: true,
          programType: 'primary',
        },
      },
    },
    select: { id: true, name: true, email: true, isAdmin: true, isTrainer: true, isTrainerUser: true },
    orderBy: [{ createdAt: 'asc' }],
  });

  const exerciseCatalog = await loadExerciseCatalog();

  return (
    <main className="min-h-screen bg-[#0A0A0F] pb-10">

      {/* Header */}
      <div className="bg-white/[0.03] border-b border-white/[0.06] px-6 py-4 flex items-center justify-between sticky top-0 backdrop-blur-xl z-10">
        <Link href="/welcome" className="text-white/40 hover:text-white/70 transition text-sm">← Home</Link>
        <p className="text-sm font-bold text-white">Admin Panel</p>
        <div className="w-10"></div>
      </div>

      <div className="max-w-2xl mx-auto px-5 pt-6">

        {/* Quick links */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <Link href="/admin/media" className="block">
            <div className="bg-white/[0.04] border border-white/[0.06] rounded-2xl p-5 hover:border-white/10 transition">
              <p className="text-xs font-semibold tracking-widest text-white/30 uppercase mb-2">Media</p>
              <p className="text-base font-bold text-white">Exercise Images</p>
              <p className="text-xs text-white/30 mt-1">Upload images and videos</p>
            </div>
          </Link>
          <Link href="/program" className="block">
            <div className="bg-white/[0.04] border border-white/[0.06] rounded-2xl p-5 hover:border-white/10 transition">
              <p className="text-xs font-semibold tracking-widest text-white/30 uppercase mb-2">Programs</p>
              <p className="text-base font-bold text-white">View Plan</p>
              <p className="text-xs text-white/30 mt-1">User-facing program view</p>
            </div>
          </Link>
        </div>

        <AdminProgramManager
          programs={programsWithAssignments}
          users={users}
          waitingUsers={waitingUsers}
          exerciseCatalog={exerciseCatalog}
        />
      </div>
    </main>
  );
}

