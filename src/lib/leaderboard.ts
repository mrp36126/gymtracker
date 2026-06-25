export type LeaderboardMetricType = 'endurance' | 'strength';

export type LeaderboardLog = {
  id: string;
  weight: number;
  sets: number;
  reps: number;
  durationSeconds: number | null;
  distanceKm: number | null;
  loggedAt: Date;
  userId: string;
  user: {
    name: string;
    email?: string | null;
  };
  exercise: {
    name: string;
  };
};

export type LeaderboardEntry = {
  id: string;
  userKey: string;
  userName: string;
  metricType: LeaderboardMetricType;
  weight: number;
  reps: number;
  sets: number;
  volume: number;
  distanceKm: number | null;
  durationSeconds: number | null;
  loggedAt: Date;
};

export type LeaderboardExerciseGroup = {
  exerciseKey: string;
  exerciseName: string;
  metricType: LeaderboardMetricType;
  entries: LeaderboardEntry[];
};

const ENDURANCE_EXERCISES = new Set(['running', 'treadmill', 'skierg', 'rowing']);

export function normalizeExerciseName(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function getLeaderboardMetricType(exerciseName: string): LeaderboardMetricType {
  return ENDURANCE_EXERCISES.has(normalizeExerciseName(exerciseName)) ? 'endurance' : 'strength';
}

function compareEntries(a: LeaderboardEntry, b: LeaderboardEntry) {
  if (a.metricType === 'endurance' || b.metricType === 'endurance') {
    const distanceDelta = (b.distanceKm ?? 0) - (a.distanceKm ?? 0);
    if (distanceDelta !== 0) return distanceDelta;

    const aDuration = a.durationSeconds ?? Number.MAX_SAFE_INTEGER;
    const bDuration = b.durationSeconds ?? Number.MAX_SAFE_INTEGER;
    if (aDuration !== bDuration) return aDuration - bDuration;

    return b.loggedAt.getTime() - a.loggedAt.getTime();
  }

  if (b.weight !== a.weight) return b.weight - a.weight;
  if (b.reps !== a.reps) return b.reps - a.reps;
  if (b.volume !== a.volume) return b.volume - a.volume;
  return b.loggedAt.getTime() - a.loggedAt.getTime();
}

export function buildLeaderboard(logs: LeaderboardLog[]) {
  const groupedLogs = new Map<string, LeaderboardExerciseGroup>();

  for (const log of logs) {
    const exerciseKey = log.exercise.name.trim().toLowerCase();
    const metricType = getLeaderboardMetricType(log.exercise.name);
    const userKey = log.user.email?.trim().toLowerCase() || log.userId;
    const group = groupedLogs.get(exerciseKey) ?? {
      exerciseKey,
      exerciseName: log.exercise.name,
      metricType,
      entries: [],
    };

    group.entries.push({
      id: log.id,
      userKey,
      userName: log.user.name,
      metricType,
      weight: metricType === 'endurance' ? 0 : log.weight,
      reps: log.reps,
      sets: log.sets,
      volume: metricType === 'endurance' ? 0 : log.weight * log.sets * log.reps,
      distanceKm: log.distanceKm,
      durationSeconds: log.durationSeconds,
      loggedAt: log.loggedAt,
    });
    groupedLogs.set(exerciseKey, group);
  }

  return Array.from(groupedLogs.values())
    .map((group) => {
      const rankedByUser = new Map<string, LeaderboardEntry>();

      for (const entry of group.entries.sort(compareEntries)) {
        if (!rankedByUser.has(entry.userKey)) {
          rankedByUser.set(entry.userKey, entry);
        }
      }

      return {
        ...group,
        entries: Array.from(rankedByUser.values()).sort(compareEntries).slice(0, 10),
      };
    })
    .sort((a, b) => a.exerciseName.localeCompare(b.exerciseName));
}

export function formatDuration(seconds: number | null | undefined) {
  if (!seconds) return '-';
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${String(remainingSeconds).padStart(2, '0')}`;
}

export function formatDistanceKm(distanceKm: number | null | undefined, exerciseName: string) {
  if (!distanceKm) return '-';
  if (normalizeExerciseName(exerciseName) === 'rowing') {
    return `${Math.round(distanceKm * 1000).toLocaleString('en-US')} m`;
  }
  return `${distanceKm.toLocaleString('en-US', { maximumFractionDigits: 2 })} km`;
}
