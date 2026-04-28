export type DayName =
  | 'Sunday' | 'Monday' | 'Tuesday' | 'Wednesday'
  | 'Thursday' | 'Friday' | 'Saturday';

const DAYS: DayName[] = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday',
  'Thursday', 'Friday', 'Saturday',
];

export function getTodayName(): DayName {
  return DAYS[new Date().getDay()];
}

export function getDayName(index: number): DayName {
  return DAYS[index % 7];
}
