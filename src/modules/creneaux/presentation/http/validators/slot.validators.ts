import { ValidateBy } from 'class-validator';

const CALENDAR_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const SLOT_TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

function isCalendarDate(value: unknown): boolean {
  if (typeof value !== 'string' || !CALENDAR_DATE_PATTERN.test(value)) {
    return false;
  }
  const date = new Date(`${value}T00:00:00.000Z`);
  return (
    !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
}

function isSlotTime(value: unknown): boolean {
  return typeof value === 'string' && SLOT_TIME_PATTERN.test(value);
}

function isIanaTimeZone(value: unknown): boolean {
  if (
    typeof value !== 'string' ||
    value.trim().length === 0 ||
    /^[+-]/.test(value)
  ) {
    return false;
  }
  try {
    Intl.DateTimeFormat('en-US', { timeZone: value }).resolvedOptions();
    return true;
  } catch {
    return false;
  }
}

export const IsCalendarDate = ValidateBy({
  name: 'isCalendarDate',
  validator: {
    validate: (value) => isCalendarDate(value),
    defaultMessage: () =>
      'doit être une date calendaire réelle au format YYYY-MM-DD',
  },
});

export const IsSlotTime = ValidateBy({
  name: 'isSlotTime',
  validator: {
    validate: (value) => isSlotTime(value),
    defaultMessage: () => 'doit être une heure au format HH:mm',
  },
});

export const IsIanaTimeZone = ValidateBy({
  name: 'isIanaTimeZone',
  validator: {
    validate: (value) => isIanaTimeZone(value),
    defaultMessage: () => 'doit être un fuseau horaire IANA connu',
  },
});
