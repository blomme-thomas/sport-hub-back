export const SLOT_TYPES = ['libre', 'occupe'] as const;

export type SlotType = (typeof SLOT_TYPES)[number];

export function isSlotType(value: unknown): value is SlotType {
  return (
    typeof value === 'string' &&
    (SLOT_TYPES as readonly string[]).includes(value)
  );
}
