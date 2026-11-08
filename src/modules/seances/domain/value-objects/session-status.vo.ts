export const SESSION_STATUSES = ['planifiee', 'realisee', 'manquee'] as const;

export type SessionStatus = (typeof SESSION_STATUSES)[number];

export function isSessionStatus(value: unknown): value is SessionStatus {
  return (
    typeof value === 'string' &&
    (SESSION_STATUSES as readonly string[]).includes(value)
  );
}
