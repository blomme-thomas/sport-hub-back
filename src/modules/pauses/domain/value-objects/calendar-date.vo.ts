const CALENDAR_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** Vrai pour une date réelle au format AAAA-MM-JJ, sans heure. */
export function isCalendarDate(value: unknown): value is string {
  if (typeof value !== 'string' || !CALENDAR_DATE_PATTERN.test(value)) {
    return false;
  }
  const date = new Date(`${value}T00:00:00.000Z`);
  return (
    !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
}
