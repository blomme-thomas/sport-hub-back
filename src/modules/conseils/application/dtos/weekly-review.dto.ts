import type {
  WeeklyReview,
  WeeklyReviewSource,
} from '../../domain/value-objects/weekly-review.vo.js';

export class WeeklyReviewDto {
  private constructor(
    readonly week: string,
    readonly suivi: string,
    readonly pointAttention: string,
    readonly conseil: string,
    readonly source: WeeklyReviewSource,
    readonly model: string | null,
    readonly generatedAt: Date,
  ) {}

  static fromDomain(review: WeeklyReview): WeeklyReviewDto {
    return new WeeklyReviewDto(
      review.week,
      review.suivi,
      review.pointAttention,
      review.conseil,
      review.source,
      review.model,
      review.generatedAt,
    );
  }
}
