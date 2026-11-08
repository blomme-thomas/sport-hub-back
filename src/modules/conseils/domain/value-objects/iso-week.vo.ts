import { WeeklyReviewInvalidWeekError } from '../errors/weekly-review-invalid-week.error.js';

const WEEK_PATTERN = /^(\d{4})-W(\d{2})$/;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Semaine ISO (lundi à dimanche) identifiée par `AAAA-Www`. */
export class IsoWeek {
  private constructor(
    readonly label: string,
    readonly monday: Date,
  ) {}

  /**
   * @throws WeeklyReviewInvalidWeekError si le format est incorrect ou si la semaine n'existe pas dans l'année (ex. W53 d'une année de 52 semaines).
   */
  static parse(value: string): IsoWeek {
    const match = WEEK_PATTERN.exec(value);
    if (match === null) {
      throw new WeeklyReviewInvalidWeekError();
    }
    const year = Number(match[1]);
    const week = Number(match[2]);
    if (week < 1 || week > 53) {
      throw new WeeklyReviewInvalidWeekError();
    }
    const monday = new Date(
      IsoWeek.week1Monday(year).getTime() + (week - 1) * 7 * DAY_MS,
    );
    const thursday = new Date(monday.getTime() + 3 * DAY_MS);
    if (thursday.getUTCFullYear() !== year) {
      throw new WeeklyReviewInvalidWeekError();
    }
    return new IsoWeek(value, monday);
  }

  /** Semaine ISO qui contient le jour UTC de `date`. */
  static containing(date: Date): IsoWeek {
    const day = Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
    );
    const monday = day - ((new Date(day).getUTCDay() + 6) % 7) * DAY_MS;
    const thursday = new Date(monday + 3 * DAY_MS);
    const year = thursday.getUTCFullYear();
    const week =
      Math.round(
        (monday - IsoWeek.week1Monday(year).getTime()) / (7 * DAY_MS),
      ) + 1;
    return IsoWeek.parse(`${year}-W${String(week).padStart(2, '0')}`);
  }

  /** Dimanche de la semaine, inclus. */
  get sunday(): Date {
    return new Date(this.monday.getTime() + 6 * DAY_MS);
  }

  /** Lundi de la semaine précédente. */
  get previousMonday(): Date {
    return new Date(this.monday.getTime() - 7 * DAY_MS);
  }

  private static week1Monday(year: number): Date {
    const jan4 = new Date(Date.UTC(year, 0, 4));
    return new Date(jan4.getTime() - ((jan4.getUTCDay() + 6) % 7) * DAY_MS);
  }
}
