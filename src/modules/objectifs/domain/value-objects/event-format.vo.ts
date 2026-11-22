export const EVENT_FORMATS = [
  'sprint',
  'olympique',
  'half',
  'full',
  'autre',
] as const;

export type EventFormat = (typeof EVENT_FORMATS)[number];

export function isEventFormat(value: unknown): value is EventFormat {
  return (
    typeof value === 'string' &&
    (EVENT_FORMATS as readonly string[]).includes(value)
  );
}
