import { Inject, Injectable } from '@nestjs/common';
import { ActivityNotFoundError } from '../../domain/errors/activity-not-found.error.js';
import {
  ACTIVITY_COMMENT_REPOSITORY,
  ACTIVITY_READER,
  CONSEILS_CLOCK,
  type ConseilsClock,
  type IActivityCommentRepository,
  type IActivityReader,
} from '../../domain/ports/outbound/conseils.ports.js';
import { ActivityComment } from '../../domain/value-objects/activity-comment.vo.js';
import { ActivityCommentDto } from '../dtos/activity-comment.dto.js';

@Injectable()
export class SaveManualActivityCommentUseCase {
  constructor(
    @Inject(ACTIVITY_READER)
    private readonly activities: IActivityReader,
    @Inject(ACTIVITY_COMMENT_REPOSITORY)
    private readonly comments: IActivityCommentRepository,
    @Inject(CONSEILS_CLOCK)
    private readonly clock: ConseilsClock,
  ) {}

  /**
   * Remplace le commentaire de l'activité par le texte saisi à la main. Aucun appel au modèle : source
   * `saisie-manuelle`, modèle `null`, date de mise à jour enregistrée.
   *
   * @throws ActivityNotFoundError si l'activité n'existe pas.
   * @throws ActivityCommentInvalidOutputError si le texte est vide.
   */
  async execute(activityId: string, text: string): Promise<ActivityCommentDto> {
    const activity = await this.activities.findActivity(activityId);
    if (activity === null) {
      throw new ActivityNotFoundError();
    }
    const comment = ActivityComment.create({
      activityId,
      text,
      source: 'saisie-manuelle',
      model: null,
      generatedAt: this.clock(),
    });
    await this.comments.save(comment);
    return ActivityCommentDto.fromDomain(comment);
  }
}
