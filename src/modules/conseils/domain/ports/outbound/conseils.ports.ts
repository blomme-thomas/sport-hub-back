import type { ActivityComment } from '../../value-objects/activity-comment.vo.js';

/** Activité réalisée, telle que le commentaire la voit. */
export interface ActivityReference {
  id: string;
  type: string;
  startedAt: Date;
  durationSeconds: number;
  distanceMeters: number | null;
}

/** Séance rapprochée de l'activité : ce qui était prévu. */
export interface PlannedSessionReference {
  date: string;
  disciplineTypeKey: string;
  durationMinutes: number;
  status: string;
}

export interface CommentGenerationInput {
  activity: ActivityReference;
  planned: PlannedSessionReference;
}

export interface GeneratedComment {
  text: string;
  model: string;
}

/** Contrat vers les activités synchronisées. */
export interface IActivityReader {
  /** Renvoie l'activité, ou null si elle n'est pas enregistrée. */
  findActivity(id: string): Promise<ActivityReference | null>;
}

/** Contrat vers les séances : renvoie la séance rapprochée de l'activité, ou null. */
export interface IPlannedSessionReader {
  findForActivity(activityId: string): Promise<PlannedSessionReference | null>;
}

/** Contrat vers le modèle de langage : rédige le commentaire à partir d'un résumé prévu/réalisé. */
export interface IActivityCommentGenerator {
  /**
   * @throws ActivityCommentUnavailableError, ActivityCommentAccessDeniedError, ActivityCommentInvalidOutputError.
   */
  generate(input: CommentGenerationInput): Promise<GeneratedComment>;
}

export interface IActivityCommentRepository {
  /** Renvoie le commentaire stocké de l'activité, ou null. */
  findByActivityId(activityId: string): Promise<ActivityComment | null>;
  /** Crée ou remplace le commentaire de l'activité. */
  save(comment: ActivityComment): Promise<void>;
}

export type ConseilsClock = () => Date;

export const ACTIVITY_READER = Symbol('ACTIVITY_READER');
export const PLANNED_SESSION_READER = Symbol('PLANNED_SESSION_READER');
export const ACTIVITY_COMMENT_GENERATOR = Symbol('ACTIVITY_COMMENT_GENERATOR');
export const ACTIVITY_COMMENT_REPOSITORY = Symbol(
  'ACTIVITY_COMMENT_REPOSITORY',
);
export const CONSEILS_CLOCK = Symbol('CONSEILS_CLOCK');
