import { ValidateBy } from 'class-validator';

const CALENDAR_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function isCalendarDate(value: unknown): boolean {
  if (typeof value !== 'string' || !CALENDAR_DATE_PATTERN.test(value)) {
    return false;
  }
  const date = new Date(`${value}T00:00:00.000Z`);
  return (
    !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
}

export const IsCalendarDate = ValidateBy({
  name: 'isCalendarDate',
  validator: {
    validate: (value) => isCalendarDate(value),
    defaultMessage: () =>
      'doit être une date calendaire réelle au format YYYY-MM-DD',
  },
});
