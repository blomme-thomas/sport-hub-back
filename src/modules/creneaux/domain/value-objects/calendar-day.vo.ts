import { InvalidSlotError } from '../errors/invalid-slot.error.js';

const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export class CalendarDay {
  private constructor(private readonly value: string) {}

  /** @throws InvalidSlotError si le texte n'est pas une date calendaire réelle au format YYYY-MM-DD. */
  static parse(text: string): CalendarDay {
    if (!DAY_PATTERN.test(text) || !isRealDay(text)) {
      throw new InvalidSlotError('la date doit être au format YYYY-MM-DD');
    }
    return new CalendarDay(text);
  }

  static fromDate(date: Date): CalendarDay {
    return new CalendarDay(date.toISOString().slice(0, 10));
  }

  /** Renvoie minuit UTC du jour, utilisé comme étiquette de jour (aucune conversion de fuseau). */
  toDate(): Date {
    return new Date(`${this.value}T00:00:00.000Z`);
  }

  toString(): string {
    return this.value;
  }
}

function isRealDay(text: string): boolean {
  const date = new Date(`${text}T00:00:00.000Z`);
  return (
    !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === text
  );
}
