const PARIS_TIME_ZONE = 'Europe/Paris';

const DAY_FORMATTER = new Intl.DateTimeFormat('en-CA', {
  timeZone: PARIS_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** Jour calendaire de Paris (YYYY-MM-DD) auquel appartient l'instant donné. */
export function parisDay(instant: Date): string {
  return DAY_FORMATTER.format(instant);
}
