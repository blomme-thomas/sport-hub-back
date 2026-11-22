import { WeeklyReviewInvalidOutputError } from '../errors/weekly-review-invalid-output.error.js';

export const WEEKLY_REVIEW_SOURCES = ['ia', 'generique'] as const;
export type WeeklyReviewSource = (typeof WEEKLY_REVIEW_SOURCES)[number];

const MAX_FIELD_LENGTH = 1000;

export interface WeeklyReviewProps {
  week: string;
  suivi: string;
  pointAttention: string;
  conseil: string;
  source: WeeklyReviewSource;
  model: string | null;
  generatedAt: Date;
}

/** Bilan d'une semaine ISO : suivi prévu contre réalisé, point d'attention et conseil pour la semaine suivante. */
export class WeeklyReview {
  private constructor(
    readonly week: string,
    readonly suivi: string,
    readonly pointAttention: string,
    readonly conseil: string,
    readonly source: WeeklyReviewSource,
    readonly model: string | null,
    readonly generatedAt: Date,
  ) {}

  /**
   * @throws WeeklyReviewInvalidOutputError si une partie est vide ou dépasse 1000 caractères.
   */
  static create(props: WeeklyReviewProps): WeeklyReview {
    return new WeeklyReview(
      props.week,
      WeeklyReview.checkField('suivi', props.suivi),
      WeeklyReview.checkField('pointAttention', props.pointAttention),
      WeeklyReview.checkField('conseil', props.conseil),
      props.source,
      props.model,
      props.generatedAt,
    );
  }

  private static checkField(name: string, value: string): string {
    const text = value.trim();
    if (text.length === 0) {
      throw new WeeklyReviewInvalidOutputError(`${name} vide`);
    }
    if (text.length > MAX_FIELD_LENGTH) {
      throw new WeeklyReviewInvalidOutputError(
        `${name} de plus de ${MAX_FIELD_LENGTH} caractères`,
      );
    }
    return text;
  }
}
