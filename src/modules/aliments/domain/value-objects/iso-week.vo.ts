import { InvalidPlannedMealError } from '../errors/invalid-planned-meal.error.js';
import { MealDate } from './meal-date.vo.js';

const WEEK_PATTERN = /^(\d{4})-W(\d{2})$/;

/** Semaine ISO `AAAA-Www` ; renvoie son lundi et son dimanche. */
export class IsoWeek {
  private constructor(
    readonly start: MealDate,
    readonly end: MealDate,
  ) {}

  /**
   * @throws InvalidPlannedMealError si le format ou le numéro de semaine (1 à 53) est invalide.
   */
  static create(raw: string): IsoWeek {
    const match = WEEK_PATTERN.exec(raw);
    if (match === null) {
      throw new InvalidPlannedMealError(
        'la semaine doit être au format AAAA-Www',
      );
    }
    const year = Number(match[1]);
    const week = Number(match[2]);
    if (week < 1 || week > 53) {
      throw new InvalidPlannedMealError('le numéro de semaine est hors plage');
    }
    const jan4 = new Date(Date.UTC(year, 0, 4));
    const mondayOfWeekOne = new Date(jan4);
    mondayOfWeekOne.setUTCDate(
      jan4.getUTCDate() - ((jan4.getUTCDay() + 6) % 7),
    );
    const monday = MealDate.fromUtcDate(
      new Date(mondayOfWeekOne.getTime() + (week - 1) * 7 * 86_400_000),
    );
    return new IsoWeek(monday, monday.addDays(6));
  }
}
