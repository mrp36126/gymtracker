import { describe, expect, it } from 'vitest';
import { parseTimeMMSS } from '@/lib/metrics-format';

describe('parseTimeMMSS', () => {
  it('parses standard mm:ss values', () => {
    expect(parseTimeMMSS('05:00')).toBe(300);
    expect(parseTimeMMSS('00:30')).toBe(30);
    expect(parseTimeMMSS('12:45')).toBe(765);
    expect(parseTimeMMSS('45:00')).toBe(2700);
  });

  it('parses compact digit values used on mobile keyboards', () => {
    expect(parseTimeMMSS('0500')).toBe(300);
    expect(parseTimeMMSS('0030')).toBe(30);
    expect(parseTimeMMSS('1234')).toBe(754);
    expect(parseTimeMMSS('4500')).toBe(2700);
    expect(parseTimeMMSS('500')).toBe(300);
  });

  it('rejects invalid values', () => {
    expect(parseTimeMMSS('60:00')).toBeNull();
    expect(parseTimeMMSS('59:60')).toBeNull();
    expect(parseTimeMMSS('5:00')).toBeNull();
    expect(parseTimeMMSS('abcd')).toBeNull();
    expect(parseTimeMMSS('5960')).toBeNull();
  });
});
