export const SESSION_RECURRENCES = ['aucune', 'hebdomadaire'] as const;

export type SessionRecurrence = (typeof SESSION_RECURRENCES)[number];

export function isSessionRecurrence(
  value: unknown,
): value is SessionRecurrence {
  return (
    typeof value === 'string' &&
    (SESSION_RECURRENCES as readonly string[]).includes(value)
  );
}
