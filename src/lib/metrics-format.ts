const MMSS_PATTERN = /^(\d{2}):([0-5]\d)$/;

export function parseTimeMMSS(value: string): number | null {
  const trimmed = value.trim();
  const match = MMSS_PATTERN.exec(trimmed);
  if (!match) return null;

  const minutes = Number(match[1]);
  const seconds = Number(match[2]);
  if (!Number.isInteger(minutes) || !Number.isInteger(seconds)) return null;
  if (minutes < 0 || minutes > 59) return null;

  return minutes * 60 + seconds;
}

export function formatTimeMMSS(totalSeconds: number | null | undefined): string {
  if (totalSeconds === null || totalSeconds === undefined || totalSeconds <= 0) return '';

  const clampedSeconds = Math.floor(totalSeconds);
  const minutes = Math.floor(clampedSeconds / 60);
  const seconds = clampedSeconds % 60;

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function parseMeters(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;

  return parsed;
}

export function formatMeters(meters: number | null | undefined): string {
  if (meters === null || meters === undefined || meters <= 0) return '-';

  return `${meters.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })} m`;
}
