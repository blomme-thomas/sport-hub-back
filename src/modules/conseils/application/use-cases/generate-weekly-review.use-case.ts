import { Inject, Injectable } from '@nestjs/common';
import {
  CONSEILS_CLOCK,
  type ConseilsClock,
} from '../../domain/ports/outbound/conseils.ports.js';
import {
  WEEKLY_DATA_READER,
  WEEKLY_REVIEW_GENERATOR,
  WEEKLY_REVIEW_REPOSITORY,
  type IWeeklyDataReader,
  type IWeeklyReviewGenerator,
  type IWeeklyReviewRepository,
} from '../../domain/ports/outbound/weekly-review.ports.js';
import { IsoWeek } from '../../domain/value-objects/iso-week.vo.js';
import { WeeklyReview } from '../../domain/value-objects/weekly-review.vo.js';
import { WeeklyReviewDto } from '../dtos/weekly-review.dto.js';

export const GENERIC_WEEKLY_REVIEW = {
  suivi:
    'Aucune séance prévue cette semaine : pas de comparaison entre le prévu et le réalisé.',
  pointAttention: "Aucun point d'attention particulier pour cette semaine.",
  conseil:
    'Aucun conseil généré : planifiez des séances pour obtenir un bilan personnalisé.',
};

@Injectable()
export class GenerateWeeklyReviewUseCase {
  constructor(
    @Inject(WEEKLY_DATA_READER)
    private readonly data: IWeeklyDataReader,
    @Inject(WEEKLY_REVIEW_GENERATOR)
    private readonly generator: IWeeklyReviewGenerator,
    @Inject(WEEKLY_REVIEW_REPOSITORY)
    private readonly reviews: IWeeklyReviewRepository,
    @Inject(CONSEILS_CLOCK)
    private readonly clock: ConseilsClock,
  ) {}

  /**
   * Génère le bilan d'une semaine ISO et le remplace s'il existe déjà.
   * Avec au moins une séance prévue, un seul appel au modèle ; sans séance prévue, un bilan générique est stocké sans appel.
   *
   * @throws WeeklyReviewInvalidWeekError si la semaine est invalide.
   * @throws WeeklyReviewUnavailableError, WeeklyReviewAccessDeniedError, WeeklyReviewInvalidOutputError : voir le port de génération.
   */
  async execute(weekLabel: string): Promise<WeeklyReviewDto> {
    const week = IsoWeek.parse(weekLabel);
    const reference = await this.data.readWeek(week);
    const generatedAt = this.clock();
    const review =
      reference.planned.length === 0
        ? WeeklyReview.create({
            week: week.label,
            ...GENERIC_WEEKLY_REVIEW,
            source: 'generique',
            model: null,
            generatedAt,
          })
        : WeeklyReview.create({
            week: week.label,
            ...(await this.generator.generate({
              week: week.label,
              ...reference,
            })),
            source: 'ia',
            generatedAt,
          });
    await this.reviews.save(review);
    return WeeklyReviewDto.fromDomain(review);
  }
}
