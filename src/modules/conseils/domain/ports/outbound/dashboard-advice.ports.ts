import type { DashboardAdvice } from '../../value-objects/dashboard-advice.vo.js';
import type { IsoWeek } from '../../value-objects/iso-week.vo.js';

export interface DashboardAdviceStats {
  readonly count: number;
  readonly durationSeconds: number;
  readonly calories: number | null;
  readonly elevationGainMeters: number | null;
  readonly averageHeartRate: number | null;
  /** Temps par zone cardiaque (zones 1 à 5), en secondes ; null si aucune séance ne le renseigne. */
  readonly hrTimeInZoneSeconds: readonly (number | null)[];
  readonly bySport: readonly {
    readonly type: string;
    readonly count: number;
    readonly durationSeconds: number;
  }[];
  readonly variationDirection: 'up' | 'down' | 'flat' | 'unknown';
  readonly variationPercent: number | null;
}

export interface DashboardAdviceRecoveryDay {
  readonly date: string;
  readonly sleepSeconds: number | null;
  readonly hrvLastNightAvg: number | null;
  readonly hrvWeeklyAvg: number | null;
  readonly bodyBatteryCharged: number | null;
  readonly bodyBatteryDrained: number | null;
  readonly restingHeartRate: number | null;
}

export interface DashboardAdviceZones {
  readonly available: boolean;
  readonly trainingMethod: string | null;
  readonly maxHeartRateUsed: number | null;
  readonly restingHeartRateUsed: number | null;
  /** Bornes basses des zones 1 à 5. */
  readonly zoneFloors: readonly (number | null)[];
}

/** Données de la semaine qui servent à rédiger le conseil. Ne contient ni identité, ni clé, ni token. */
export interface DashboardAdviceData {
  readonly week: string;
  readonly stats: DashboardAdviceStats;
  readonly recovery: readonly DashboardAdviceRecoveryDay[];
  readonly zones: DashboardAdviceZones;
}

export interface GeneratedDashboardAdvice {
  readonly text: string;
  readonly model: string;
}

/** Contrat vers les façades de statistiques, de récupération et de zones. */
export interface IDashboardAdviceDataReader {
  readWeek(week: IsoWeek): Promise<DashboardAdviceData>;
}

/** Contrat vers le modèle de langage : rédige le conseil. */
export interface IDashboardAdviceGenerator {
  /**
   * @throws DashboardAdviceUnavailableError, DashboardAdviceAccessDeniedError, DashboardAdviceInvalidOutputError.
   */
  generate(input: DashboardAdviceData): Promise<GeneratedDashboardAdvice>;
}

export interface IDashboardAdviceRepository {
  findByWeek(week: string): Promise<DashboardAdvice | null>;
  /** Crée ou remplace le conseil de la semaine. */
  save(advice: DashboardAdvice): Promise<void>;
}

export const DASHBOARD_ADVICE_DATA_READER = Symbol(
  'DASHBOARD_ADVICE_DATA_READER',
);
export const DASHBOARD_ADVICE_GENERATOR = Symbol('DASHBOARD_ADVICE_GENERATOR');
export const DASHBOARD_ADVICE_REPOSITORY = Symbol(
  'DASHBOARD_ADVICE_REPOSITORY',
);
