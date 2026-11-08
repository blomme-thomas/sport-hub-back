import { Inject, Injectable } from '@nestjs/common';
import { ActivityCommentNotFoundError } from '../../domain/errors/activity-comment-not-found.error.js';
import {
  ACTIVITY_COMMENT_REPOSITORY,
  type IActivityCommentRepository,
} from '../../domain/ports/outbound/conseils.ports.js';
import { ActivityCommentDto } from '../dtos/activity-comment.dto.js';

@Injectable()
export class GetActivityCommentUseCase {
  constructor(
    @Inject(ACTIVITY_COMMENT_REPOSITORY)
    private readonly comments: IActivityCommentRepository,
  ) {}

  /**
   * Renvoie le commentaire stocké de l'activité, sans appel au modèle.
   *
   * @throws ActivityCommentNotFoundError si aucun commentaire n'a été généré.
   */
  async execute(activityId: string): Promise<ActivityCommentDto> {
    const comment = await this.comments.findByActivityId(activityId);
    if (comment === null) {
      throw new ActivityCommentNotFoundError();
    }
    return ActivityCommentDto.fromDomain(comment);
  }
}
