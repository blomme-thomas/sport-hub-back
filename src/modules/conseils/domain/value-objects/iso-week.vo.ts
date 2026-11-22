import {
  isoWeekContaining,
  parseIsoWeek,
} from '../../../../shared/domain/value-objects/iso-week.vo.js';
import { WeeklyReviewInvalidWeekError } from '../errors/weekly-review-invalid-week.error.js';

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
    const week = parseIsoWeek(value);
    if (week === null) {
      throw new WeeklyReviewInvalidWeekError();
    }
    return new IsoWeek(week.label, week.monday);
  }

  /** Semaine ISO qui contient le jour UTC de `date`. */
  static containing(date: Date): IsoWeek {
    const week = isoWeekContaining(date);
    return new IsoWeek(week.label, week.monday);
  }

  /** Dimanche de la semaine, inclus. */
  get sunday(): Date {
    return new Date(this.monday.getTime() + 6 * DAY_MS);
  }

  /** Lundi de la semaine précédente. */
  get previousMonday(): Date {
    return new Date(this.monday.getTime() - 7 * DAY_MS);
  }
}
