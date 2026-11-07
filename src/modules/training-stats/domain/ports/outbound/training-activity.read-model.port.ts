export interface TrainingActivityFact {
  readonly type: string;
  readonly startedAt: Date;
  readonly durationSeconds: number;
  readonly distanceMeters: number | null;
}

export interface TrainingActivityWindow {
  readonly from: Date;
  readonly toExclusive: Date;
  readonly type: string | null;
}

export interface ITrainingActivityReadModel {
  /**
   * Renvoie les faits d'activité dont la date de début tombe dans la fenêtre (`from` inclus, `toExclusive` exclu),
   * filtrés sur le type si `type` est renseigné. Le résultat n'est pas trié.
   */
  findFacts(window: TrainingActivityWindow): Promise<TrainingActivityFact[]>;
}

export const TRAINING_ACTIVITY_READ_MODEL = Symbol(
  'TRAINING_ACTIVITY_READ_MODEL',
);
