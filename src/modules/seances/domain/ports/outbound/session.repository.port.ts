import type { Session } from '../../entities/session.entity.js';
import type { SessionId } from '../../value-objects/session-id.vo.js';

export interface SessionPeriod {
  from: Date;
  to: Date;
}

export interface ISessionRepository {
  /** Renvoie la séance portant cet identifiant, ou null s'il n'existe pas. */
  findById(id: SessionId): Promise<Session | null>;

  /**
   * Renvoie les séances dont la date est comprise entre `from` et `to`, bornes incluses, triées par date croissante.
   */
  findByPeriod(period: SessionPeriod): Promise<Session[]>;

  /**
   * Renvoie les séances susceptibles d'avoir une occurrence dans la période : celles dont la date est antérieure ou égale à `to`, et qui sont soit datées dans la période, soit hebdomadaires.
   */
  findOccurrenceCandidates(period: SessionPeriod): Promise<Session[]>;

  /** Renvoie les séances liées à l'une de ces activités, sans doublon. */
  findByActivityIds(activityIds: string[]): Promise<Session[]>;

  /** Enregistre la séance : crée si elle est nouvelle, met à jour sinon, et ajoute uniquement ses entrées de journal en attente. */
  save(session: Session): Promise<void>;

  /** Supprime la séance portant cet identifiant ; sans effet s'il n'existe pas. */
  delete(id: SessionId): Promise<void>;
}

export const SESSION_REPOSITORY = Symbol('SESSION_REPOSITORY');
