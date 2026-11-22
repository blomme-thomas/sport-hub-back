import { Inject, Injectable } from '@nestjs/common';
import { WeeklyReviewNotFoundError } from '../../domain/errors/weekly-review-not-found.error.js';
import {
  WEEKLY_REVIEW_REPOSITORY,
  type IWeeklyReviewRepository,
} from '../../domain/ports/outbound/weekly-review.ports.js';
import { IsoWeek } from '../../domain/value-objects/iso-week.vo.js';
import { WeeklyReviewDto } from '../dtos/weekly-review.dto.js';

@Injectable()
export class GetWeeklyReviewUseCase {
  constructor(
    @Inject(WEEKLY_REVIEW_REPOSITORY)
    private readonly reviews: IWeeklyReviewRepository,
  ) {}

  /**
   * Renvoie le bilan stocké de la semaine, sans appel au modèle.
   *
   * @throws WeeklyReviewInvalidWeekError si la semaine est invalide.
   * @throws WeeklyReviewNotFoundError si aucun bilan n'a été généré pour cette semaine.
   */
  async execute(weekLabel: string): Promise<WeeklyReviewDto> {
    const week = IsoWeek.parse(weekLabel);
    const review = await this.reviews.findByWeek(week.label);
    if (review === null) {
      throw new WeeklyReviewNotFoundError();
    }
    return WeeklyReviewDto.fromDomain(review);
  }
}
