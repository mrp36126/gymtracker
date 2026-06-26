import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { isAdmin } from '@/lib/rbac';
import { getLeaderboardMetricType } from '@/lib/leaderboard';

const LeaderboardEntrySchema = z.object({
  userId: z.string().cuid(),
  exerciseId: z.string().cuid(),
  loggedAt: z.string().datetime(),
  sets: z.coerce.number().int().positive().max(20),
  reps: z.coerce.number().int().positive().max(100).optional(),
  weight: z.coerce.number().nonnegative().optional(),
  durationSeconds: z.coerce.number().int().positive().optional(),
  distanceKm: z.coerce.number().positive().optional(),
  notes: z.string().max(255).optional().default(''),
});

function validateMetrics(input: z.infer<typeof LeaderboardEntrySchema>, exerciseName: string) {
  const metricType = getLeaderboardMetricType(exerciseName);

  if (metricType === 'endurance') {
    if (!input.durationSeconds || !input.distanceKm) {
      return 'Distance (meters) and time (mm:ss) are required for endurance leaderboard entries';
    }
    return null;
  }

  if (input.weight === undefined || input.reps === undefined) {
    return 'Weight and reps are required for strength leaderboard entries';
  }

  return null;
}

export async function GET() {
  const { user, response } = await requireAuth();
  if (response) return response;
  if (!isAdmin(user!)) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  const [entries, users, exercises] = await Promise.all([
    prisma.workoutLog.findMany({
      include: {
        user: { select: { id: true, name: true, email: true } },
        exercise: { select: { id: true, name: true } },
      },
      orderBy: { loggedAt: 'desc' },
      take: 500,
    }),
    prisma.user.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, name: true, email: true },
    }),
    prisma.exercise.findMany({
      orderBy: [{ name: 'asc' }, { createdAt: 'desc' }],
      select: { id: true, name: true, muscleGroup: true },
    }),
  ]);

  return NextResponse.json({ data: { entries, users, exercises } });
}

export async function POST(req: NextRequest) {
  const { user, response } = await requireAuth();
  if (response) return response;
  if (!isAdmin(user!)) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  let input: z.infer<typeof LeaderboardEntrySchema>;
  try {
    input = LeaderboardEntrySchema.parse(await req.json());
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues.map((issue) => issue.message).join('\n') }, { status: 422 });
    }
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const [targetUser, exercise] = await Promise.all([
    prisma.user.findUnique({ where: { id: input.userId }, select: { id: true } }),
    prisma.exercise.findUnique({ where: { id: input.exerciseId }, select: { id: true, name: true } }),
  ]);

  if (!targetUser) return NextResponse.json({ error: 'User not found' }, { status: 404 });
  if (!exercise) return NextResponse.json({ error: 'Exercise not found' }, { status: 404 });

  const metricError = validateMetrics(input, exercise.name);
  if (metricError) return NextResponse.json({ error: metricError }, { status: 422 });

  const metricType = getLeaderboardMetricType(exercise.name);
  const entry = await prisma.workoutLog.create({
    data: {
      userId: input.userId,
      exerciseId: input.exerciseId,
      loggedAt: new Date(input.loggedAt),
      sets: input.sets,
      reps: metricType === 'endurance' ? 1 : input.reps!,
      weight: metricType === 'endurance' ? 0 : input.weight!,
      distanceKm: metricType === 'endurance' ? input.distanceKm! : input.distanceKm ?? null,
      durationSeconds: metricType === 'endurance' ? input.durationSeconds! : input.durationSeconds ?? null,
      notes: input.notes || null,
    },
  });

  return NextResponse.json({ data: entry }, { status: 201 });
}
