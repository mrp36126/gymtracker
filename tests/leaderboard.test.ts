import { describe, expect, it } from 'vitest';
import {
  buildLeaderboard,
  formatDistanceKm,
  formatDuration,
  getLeaderboardMetricType,
} from '@/lib/leaderboard';

describe('leaderboard helpers', () => {
  it('classifies endurance leaderboard exercises by name', () => {
    expect(getLeaderboardMetricType('Running')).toBe('endurance');
    expect(getLeaderboardMetricType('Treadmill')).toBe('endurance');
    expect(getLeaderboardMetricType('SkiErg')).toBe('endurance');
    expect(getLeaderboardMetricType('Rowing')).toBe('endurance');
    expect(getLeaderboardMetricType('Bench Press')).toBe('strength');
  });

  it('ignores weight for endurance entries and ranks by distance then fastest time', () => {
    const leaderboard = buildLeaderboard([
      {
        id: 'log-1',
        weight: 999,
        sets: 1,
        reps: 1,
        durationSeconds: 500,
        distanceKm: 2000,
        loggedAt: new Date('2026-06-25T10:00:00Z'),
        userId: 'user-1',
        user: { name: 'Reggie', email: 'reggie@example.com' },
        exercise: { name: 'Rowing' },
      },
      {
        id: 'log-2',
        weight: 10,
        sets: 1,
        reps: 1,
        durationSeconds: 495,
        distanceKm: 2000,
        loggedAt: new Date('2026-06-25T11:00:00Z'),
        userId: 'user-2',
        user: { name: 'Alex', email: 'alex@example.com' },
        exercise: { name: 'Rowing' },
      },
    ]);

    expect(leaderboard[0].metricType).toBe('endurance');
    expect(leaderboard[0].entries[0]).toMatchObject({
      userName: 'Alex',
      weight: 0,
      distanceKm: 2000,
      durationSeconds: 495,
    });
  });

  it('formats endurance distances in meters and time as mm:ss', () => {
    expect(formatDistanceKm(2000, 'Rowing')).toBe('2,000 m');
    expect(formatDistanceKm(5000, 'Running')).toBe('5,000 m');
    expect(formatDuration(1530)).toBe('25:30');
  });
});
