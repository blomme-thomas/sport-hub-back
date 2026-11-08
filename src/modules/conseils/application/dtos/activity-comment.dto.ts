import type {
  ActivityComment,
  CommentSource,
} from '../../domain/value-objects/activity-comment.vo.js';

export class ActivityCommentDto {
  private constructor(
    readonly activityId: string,
    readonly text: string,
    readonly source: CommentSource,
    readonly model: string | null,
    readonly generatedAt: Date,
  ) {}

  static fromDomain(comment: ActivityComment): ActivityCommentDto {
    return new ActivityCommentDto(
      comment.activityId,
      comment.text,
      comment.source,
      comment.model,
      comment.generatedAt,
    );
  }
}
