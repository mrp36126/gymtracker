/**
 * Timezone utilities for South African Standard Time (SAST - UTC+2)
 */

/**
 * Get the current date/time in South African timezone
 * SAST is UTC+2
 */
export function getNowInSAST(): Date {
  // Create a date in the user's local time, then adjust to SAST
  const now = new Date();
  const SASTDate = new Date(now.toLocaleString('en-US', { timeZone: 'Africa/Johannesburg' }));
  return SASTDate;
}

/**
 * Get start of today in South African timezone (00:00:00)
 */
export function getStartOfTodayInSAST(): Date {
  const now = getNowInSAST();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  return startOfDay;
}

/**
 * Get end of today in South African timezone (23:59:59)
 */
export function getEndOfTodayInSAST(): Date {
  const now = getNowInSAST();
  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);
  return endOfDay;
}

/**
 * Get a date X days ago in South African timezone
 */
export function getDateXDaysAgoInSAST(days: number): Date {
  const now = getNowInSAST();
  const pastDate = new Date(now);
  pastDate.setDate(pastDate.getDate() - days);
  pastDate.setHours(0, 0, 0, 0);
  return pastDate;
}
