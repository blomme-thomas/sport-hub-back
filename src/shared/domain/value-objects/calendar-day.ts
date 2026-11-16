/** Jour calendaire UTC au format `YYYY-MM-DD`. */
export function calendarDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}
