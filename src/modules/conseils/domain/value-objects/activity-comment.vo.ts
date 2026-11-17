import { ActivityCommentInvalidOutputError } from '../errors/activity-comment-invalid-output.error.js';

export const COMMENT_SOURCES = ['ia', 'generique', 'saisie-manuelle'] as const;
export type CommentSource = (typeof COMMENT_SOURCES)[number];

const MAX_COMMENT_LENGTH = 1000;
const MANUAL_SOURCE: CommentSource = 'saisie-manuelle';

export interface ActivityCommentProps {
  activityId: string;
  text: string;
  source: CommentSource;
  model: string | null;
  generatedAt: Date;
}

/** Commentaire stocké pour une activité réalisée : texte, origine (IA ou générique), modèle et date de génération. */
export class ActivityComment {
  private constructor(
    readonly activityId: string,
    readonly text: string,
    readonly source: CommentSource,
    readonly model: string | null,
    readonly generatedAt: Date,
  ) {}

  /**
   * La limite de 1000 caractères ne vaut que pour le texte généré ; la saisie manuelle n'en a pas.
   *
   * @throws ActivityCommentInvalidOutputError si le texte est vide, ou dépasse 1000 caractères pour un texte généré.
   */
  static create(props: ActivityCommentProps): ActivityComment {
    const text = props.text.trim();
    if (text.length === 0) {
      throw new ActivityCommentInvalidOutputError('texte vide');
    }
    if (props.source !== MANUAL_SOURCE && text.length > MAX_COMMENT_LENGTH) {
      throw new ActivityCommentInvalidOutputError(
        `texte de plus de ${MAX_COMMENT_LENGTH} caractères`,
      );
    }
    return new ActivityComment(
      props.activityId,
      text,
      props.source,
      props.model,
      props.generatedAt,
    );
  }
}
