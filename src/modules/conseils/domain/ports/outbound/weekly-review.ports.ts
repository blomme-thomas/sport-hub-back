import type { IsoWeek } from '../../value-objects/iso-week.vo.js';
import type { WeeklyReview } from '../../value-objects/weekly-review.vo.js';

export interface WeeklySessionReference {
  date: string;
  disciplineTypeKey: string;
  durationMinutes: number;
  status: string;
}

export interface WeeklyVolumeReference {
  count: number;
  durationSeconds: number;
  distanceMeters: number;
}

/** Ce qui sert à rédiger le bilan d'une semaine : séances prévues de la semaine, volume de la semaine et de la précédente. */
export interface WeeklyDataReference {
  planned: WeeklySessionReference[];
  current: WeeklyVolumeReference;
  previous: WeeklyVolumeReference;
}

export interface WeeklyReviewInput extends WeeklyDataReference {
  week: string;
}

export interface GeneratedWeeklyReview {
  suivi: string;
  pointAttention: string;
  conseil: string;
  model: string;
}

/** Contrat vers les séances et les statistiques de volume. */
export interface IWeeklyDataReader {
  readWeek(week: IsoWeek): Promise<WeeklyDataReference>;
}

/** Contrat vers le modèle de langage : rédige les trois parties du bilan. */
export interface IWeeklyReviewGenerator {
  /**
   * @throws WeeklyReviewUnavailableError, WeeklyReviewAccessDeniedError, WeeklyReviewInvalidOutputError.
   */
  generate(input: WeeklyReviewInput): Promise<GeneratedWeeklyReview>;
}

export interface IWeeklyReviewRepository {
  /** Renvoie le bilan stocké de la semaine, ou null. */
  findByWeek(week: string): Promise<WeeklyReview | null>;
  /** Crée ou remplace le bilan de la semaine. */
  save(review: WeeklyReview): Promise<void>;
}

export const WEEKLY_DATA_READER = Symbol('WEEKLY_DATA_READER');
export const WEEKLY_REVIEW_GENERATOR = Symbol('WEEKLY_REVIEW_GENERATOR');
export const WEEKLY_REVIEW_REPOSITORY = Symbol('WEEKLY_REVIEW_REPOSITORY');
