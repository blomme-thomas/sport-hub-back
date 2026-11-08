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

export interface DashboardActivityMetricsFact {
  readonly calories: number | null;
  readonly elevationGainMeters: number | null;
  readonly averageHeartRate: number | null;
  readonly hrTimeInZone: readonly (number | null)[];
}

export interface DashboardActivityFact {
  readonly type: string;
  readonly startedAt: Date;
  readonly durationSeconds: number;
  readonly metrics: DashboardActivityMetricsFact;
}

export interface ITrainingActivityReadModel {
  /**
   * Renvoie les faits d'activité dont la date de début tombe dans la fenêtre (`from` inclus, `toExclusive` exclu),
   * filtrés sur le type si `type` est renseigné. Le résultat n'est pas trié.
   */
  findFacts(window: TrainingActivityWindow): Promise<TrainingActivityFact[]>;

  /**
   * Renvoie les faits enrichis des indicateurs du tableau de bord pour la fenêtre (mêmes bornes que `findFacts`, sans filtre de type).
   * Un indicateur absent en base reste `null`.
   */
  findDashboardFacts(
    window: TrainingActivityWindow,
  ): Promise<DashboardActivityFact[]>;
}

export const TRAINING_ACTIVITY_READ_MODEL = Symbol(
  'TRAINING_ACTIVITY_READ_MODEL',
);
