import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { resolveManagedTargetUser } from '@/lib/trainer-context';
import type { PreviousWorkoutReference, PreviousWorkoutSetReference } from '@/types';
import { getStartOfTodayInSAST } from '@/lib/timezone';

function parseSetNumber(note: string | null | undefined, fallback: number) {
  if (!note) return fallback;

  const match = /^\s*Set\s+(\d+)\s*$/i.exec(note);
  if (!match?.[1]) {
    return fallback;
  }

  const parsed = Number.parseInt(match[1], 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function getSASTDayBounds(date: Date) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Johannesburg',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  const year = parts.find((part) => part.type === 'year')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;
  const day = parts.find((part) => part.type === 'day')?.value;

  if (!year || !month || !day) {
    return {
      start: date,
      end: date,
    };
  }

  return {
    start: new Date(`${year}-${month}-${day}T00:00:00+02:00`),
    end: new Date(`${year}-${month}-${day}T23:59:59.999+02:00`),
  };
}

export async function GET(req: NextRequest) {
  const { user, response } = await requireAuth();
  if (response) return response;

  const { searchParams } = new URL(req.url);
  const exerciseId = searchParams.get('exerciseId')?.trim();
  const exerciseName = searchParams.get('exerciseName')?.trim();
  const targetUserId = searchParams.get('targetUserId')?.trim();

  if (!exerciseId) {
    return NextResponse.json({ error: 'exerciseId is required' }, { status: 400 });
  }

  const targetUser = await resolveManagedTargetUser(user!, targetUserId);
  if (!targetUser) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const cutoffDate = getStartOfTodayInSAST();

  const latestPreviousById = await prisma.workoutLog.findFirst({
    where: {
      userId: targetUser.id,
      exerciseId,
      loggedAt: { lt: cutoffDate },
    },
    orderBy: { loggedAt: 'desc' },
    select: {
      id: true,
      loggedAt: true,
    },
  });

  const latestPreviousByName = !latestPreviousById && exerciseName
    ? await prisma.workoutLog.findFirst({
        where: {
          userId: targetUser.id,
          exercise: {
            name: exerciseName,
          },
          loggedAt: { lt: cutoffDate },
        },
        orderBy: { loggedAt: 'desc' },
        select: {
          id: true,
          loggedAt: true,
          exerciseId: true,
        },
      })
    : null;

  const latestPreviousLog = latestPreviousById
    ? { ...latestPreviousById, exerciseId }
    : latestPreviousByName;

  if (!latestPreviousLog) {
    return NextResponse.json({ error: 'No previous workout found.' }, { status: 404 });
  }

  const bounds = getSASTDayBounds(latestPreviousLog.loggedAt);

  const logs = await prisma.workoutLog.findMany({
    where: {
      userId: targetUser.id,
      exerciseId: latestPreviousLog.exerciseId,
      loggedAt: {
        gte: bounds.start,
        lte: bounds.end,
      },
    },
    orderBy: { loggedAt: 'asc' },
    select: {
      id: true,
      weight: true,
      reps: true,
      durationSeconds: true,
      distanceKm: true,
      notes: true,
      loggedAt: true,
    },
  });

  const normalizedSets: PreviousWorkoutSetReference[] = logs
    .map((log, index) => ({
      setNumber: parseSetNumber(log.notes, index + 1),
      weight: log.weight,
      reps: log.reps,
      durationSeconds: log.durationSeconds,
      distanceKm: log.distanceKm,
      rpe: null,
      restSeconds: null,
      notes: log.notes,
      loggedAt: log.loggedAt.toISOString(),
    }))
    .sort((left, right) => {
      if (left.setNumber !== right.setNumber) {
        return left.setNumber - right.setNumber;
      }
      return (left.loggedAt ?? '').localeCompare(right.loggedAt ?? '');
    });

  const payload: PreviousWorkoutReference = {
    workoutDate: latestPreviousLog.loggedAt.toISOString(),
    sets: normalizedSets,
  };

  return NextResponse.json({ data: payload });
}
