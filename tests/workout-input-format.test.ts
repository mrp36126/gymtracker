import { describe, expect, it } from 'vitest';
import { formatDurationFromDigits, sanitizeDistanceInput } from '@/lib/workout-input-format';

describe('workout input format helpers', () => {
  it('formats digit-only time input as mm:ss', () => {
    expect(formatDurationFromDigits('0500')).toBe('05:00');
    expect(formatDurationFromDigits('0030')).toBe('00:30');
    expect(formatDurationFromDigits('1234')).toBe('12:34');
    expect(formatDurationFromDigits('4500')).toBe('45:00');
  });

  it('keeps duration input digit-only and bounded to four digits', () => {
    expect(formatDurationFromDigits('ab12:34cd')).toBe('12:34');
    expect(formatDurationFromDigits('123456')).toBe('12:34');
    expect(formatDurationFromDigits('')).toBe('00:00');
  });

  it('allows a single decimal point for distance input', () => {
    expect(sanitizeDistanceInput('25.4')).toBe('25.4');
    expect(sanitizeDistanceInput('100.25')).toBe('100.25');
    expect(sanitizeDistanceInput('400.5')).toBe('400.5');
    expect(sanitizeDistanceInput('1000')).toBe('1000');
  });

  it('removes invalid distance characters and extra decimal points', () => {
    expect(sanitizeDistanceInput('12..34')).toBe('12.34');
    expect(sanitizeDistanceInput('a1b2.c3.4')).toBe('12.34');
    expect(sanitizeDistanceInput('..5')).toBe('.5');
  });
});
