export const SLOT_RECURRENCES = ['aucune', 'hebdomadaire'] as const;

export type SlotRecurrence = (typeof SLOT_RECURRENCES)[number];

export function isSlotRecurrence(value: unknown): value is SlotRecurrence {
  return (
    typeof value === 'string' &&
    (SLOT_RECURRENCES as readonly string[]).includes(value)
  );
}
