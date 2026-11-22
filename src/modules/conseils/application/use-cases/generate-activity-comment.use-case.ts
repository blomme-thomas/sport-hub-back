import { Inject, Injectable } from '@nestjs/common';
import { ActivityNotFoundError } from '../../domain/errors/activity-not-found.error.js';
import {
  ACTIVITY_COMMENT_GENERATOR,
  ACTIVITY_COMMENT_REPOSITORY,
  ACTIVITY_READER,
  CONSEILS_CLOCK,
  type ConseilsClock,
  type IActivityCommentGenerator,
  type IActivityCommentRepository,
  type IActivityReader,
  type IPlannedSessionReader,
  PLANNED_SESSION_READER,
} from '../../domain/ports/outbound/conseils.ports.js';
import { ActivityComment } from '../../domain/value-objects/activity-comment.vo.js';
import { ActivityCommentDto } from '../dtos/activity-comment.dto.js';

export const GENERIC_COMMENT_TEXT =
  "Activité enregistrée. Aucune séance prévue n'y est rattachée, il n'y a donc pas de comparaison avec le prévu.";

@Injectable()
export class GenerateActivityCommentUseCase {
  constructor(
    @Inject(ACTIVITY_READER)
    private readonly activities: IActivityReader,
    @Inject(PLANNED_SESSION_READER)
    private readonly planned: IPlannedSessionReader,
    @Inject(ACTIVITY_COMMENT_GENERATOR)
    private readonly generator: IActivityCommentGenerator,
    @Inject(ACTIVITY_COMMENT_REPOSITORY)
    private readonly comments: IActivityCommentRepository,
    @Inject(CONSEILS_CLOCK)
    private readonly clock: ConseilsClock,
  ) {}

  /**
   * Génère le commentaire d'une activité et le remplace s'il existe déjà.
   * Avec une séance rapprochée, un seul appel au modèle ; sans séance, un commentaire générique est stocké sans appel.
   *
   * @throws ActivityNotFoundError si l'activité n'existe pas.
   * @throws ActivityCommentUnavailableError, ActivityCommentAccessDeniedError, ActivityCommentInvalidOutputError : voir le port de génération.
   */
  async execute(activityId: string): Promise<ActivityCommentDto> {
    const activity = await this.activities.findActivity(activityId);
    if (activity === null) {
      throw new ActivityNotFoundError();
    }
    const planned = await this.planned.findForActivity(activityId);
    const generatedAt = this.clock();
    const comment =
      planned === null
        ? ActivityComment.create({
            activityId,
            text: GENERIC_COMMENT_TEXT,
            source: 'generique',
            model: null,
            generatedAt,
          })
        : ActivityComment.create({
            activityId,
            ...(await this.generator.generate({ activity, planned })),
            source: 'ia',
            generatedAt,
          });
    await this.comments.save(comment);
    return ActivityCommentDto.fromDomain(comment);
  }
}
