import { InvalidSlotError } from '../errors/invalid-slot.error.js';

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;
const MINUTES_PER_HOUR = 60;
const MINUTES_PER_DAY = 24 * MINUTES_PER_HOUR;

export class LocalTime {
  private constructor(private readonly totalMinutes: number) {}

  /** @throws InvalidSlotError si le texte n'est pas une heure HH:mm sur 24 heures. */
  static parse(text: string): LocalTime {
    const match = TIME_PATTERN.exec(text);
    if (match === null) {
      throw new InvalidSlotError("l'heure doit être au format HH:mm");
    }
    return new LocalTime(
      Number(match[1]) * MINUTES_PER_HOUR + Number(match[2]),
    );
  }

  /** @throws InvalidSlotError si les minutes ne sont pas un entier entre 0 et 1439. */
  static fromMinutes(minutes: number): LocalTime {
    if (
      !Number.isInteger(minutes) ||
      minutes < 0 ||
      minutes >= MINUTES_PER_DAY
    ) {
      throw new InvalidSlotError(
        'le nombre de minutes doit être compris entre 0 et 1439',
      );
    }
    return new LocalTime(minutes);
  }

  minutes(): number {
    return this.totalMinutes;
  }

  toString(): string {
    const hours = Math.floor(this.totalMinutes / MINUTES_PER_HOUR);
    const minutes = this.totalMinutes % MINUTES_PER_HOUR;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  }
}
