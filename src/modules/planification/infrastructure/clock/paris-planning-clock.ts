const PARIS_TIME_ZONE = 'Europe/Paris';

const DAY_FORMATTER = new Intl.DateTimeFormat('en-CA', {
  timeZone: PARIS_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** Jour courant à Paris au format YYYY-MM-DD, fuseau par défaut des créneaux. */
export function parisToday(): string {
  return DAY_FORMATTER.format(new Date());
}
