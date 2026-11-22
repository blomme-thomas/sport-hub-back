import { calendarDay } from '../../../shared/domain/value-objects/calendar-day.js';
import type {
  WeekActivity,
  WeekActivityDetail,
  WeekSessionOccurrence,
  WeekVolumes,
} from '../domain/ports/outbound/week-export.ports.js';

export const WEEK_EXPORT_KIND = 'bilan-semaine';
export const WEEK_EXPORT_SCHEMA_VERSION = 1;

export const WEEK_EXPORT_NOTES =
  'Fichier bilan-semaine, version 1, pour la semaine ISO (lundi au dimanche) indiquée dans `periode`. ' +
  "`seances` liste chaque séance de la semaine avec son plan (`plan`) et son réalisé rapproché (`realise`, null si la séance n'a pas été réalisée). " +
  '`atteinte` compare le réalisé au plan (taux en pourcentage, écarts par zone en points). ' +
  '`activitesNonPlanifiees` liste les activités réalisées sans séance. `resume` totalise le plan et le réalisé et les compare à la semaine précédente. ' +
  'Les durées sont en secondes, sauf `dureePrevueMinutes` et `plan.durationMinutes` ; les distances en mètres ; les dates en ISO 8601. ' +
  'Les zones de fréquence cardiaque sont numérotées de 1 à 5 et `hrTimeInZone` donne le temps passé dans chaque zone (unité supposée : secondes). ' +
  "Consigne d'analyse : compare le plan au réalisé, dis si la charge progresse ou baisse par rapport à la semaine précédente, et relève les écarts et points d'attention. " +
  "Ne donne pas d'avis médical.";

export interface WeekExportInput {
  label: string;
  monday: Date;
  sunday: Date;
  occurrences: WeekSessionOccurrence[];
  activities: WeekActivity[];
  linkedDetails: ReadonlyMap<string, WeekActivityDetail>;
  volumes: WeekVolumes;
}

export interface WeekExportDto {
  kind: typeof WEEK_EXPORT_KIND;
  schemaVersion: typeof WEEK_EXPORT_SCHEMA_VERSION;
  periode: { semaine: string; premierJour: string; dernierJour: string };
  notesPourLAnalyse: string;
  resume: WeekSummaryDto;
  seances: WeekExportSessionDto[];
  activitesNonPlanifiees: WeekExportActivityDto[];
}

export interface PlannedSummaryDto {
  seancesPrevues: number;
  seancesRealisees: number;
  seancesManquees: number;
  seancesAnnulees: number;
  dureePrevueMinutes: number;
  distancePrevueMeters: number | null;
}

export interface WeekSummaryDto extends PlannedSummaryDto {
  dureeRealiseeSeconds: number;
  distanceRealiseeMeters: number;
  activitesRealisees: number;
  semainePrecedente: {
    activitesRealisees: number;
    dureeRealiseeSeconds: number;
    distanceRealiseeMeters: number;
  };
  variation: {
    activitesPourcent: number | null;
    dureePourcent: number | null;
    distancePourcent: number | null;
  };
}

export interface WeekExportSessionDto {
  sessionId: string;
  date: string;
  startTime: string | null;
  disciplineTypeKey: string;
  statut: string;
  plan: {
    durationMinutes: number;
    targetDistanceMeters: number | null;
    targetHrZonePercentages: number[] | null;
    modules: WeekExportModuleDto[];
  };
  realise: WeekExportRealisedDto | null;
  atteinte: WeekExportAchievementDto | null;
}

export interface WeekExportModuleDto {
  position: number;
  type: string;
  durationMinutes: number;
  instruction: string;
  targetZones: unknown;
  perceivedEffort: number | null;
}

export interface WeekExportRealisedDto {
  type: string;
  startedAt: Date;
  durationSeconds: number;
  distanceMeters: number | null;
  averageHeartRate: number | null;
  hrTimeInZone: (number | null)[];
  perceivedEffort: number | null;
  feeling: number | null;
}

export interface WeekExportAchievementDto {
  distanceRate: number | null;
  durationRate: number | null;
  zoneGapsPoints: number[] | null;
}

export interface WeekExportActivityDto {
  type: string;
  startedAt: Date;
  durationSeconds: number;
  distanceMeters: number | null;
  averageHeartRate: number | null;
}

const PARIS_DAY = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Europe/Paris',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/**
 * Assemble le fichier `bilan-semaine`. Une séance ne reçoit son réalisé que si l'activité liée est du même jour (heure de Paris) :
 * une série hebdomadaire ne garde qu'une activité liée, qui ne doit pas se répéter sur les autres semaines.
 * Les champs sont repris un à un : aucune donnée brute Garmin, identifiant Garmin ou nom de compte n'est repris.
 */
export function buildWeekExport(input: WeekExportInput): WeekExportDto {
  const planned = plannedSummary(input.occurrences);
  return {
    kind: WEEK_EXPORT_KIND,
    schemaVersion: WEEK_EXPORT_SCHEMA_VERSION,
    periode: {
      semaine: input.label,
      premierJour: calendarDay(input.monday),
      dernierJour: calendarDay(input.sunday),
    },
    notesPourLAnalyse: WEEK_EXPORT_NOTES,
    resume: {
      ...planned,
      dureeRealiseeSeconds: input.volumes.current.durationSeconds,
      distanceRealiseeMeters: input.volumes.current.distanceMeters,
      activitesRealisees: input.volumes.current.count,
      semainePrecedente: {
        activitesRealisees: input.volumes.previous.count,
        dureeRealiseeSeconds: input.volumes.previous.durationSeconds,
        distanceRealiseeMeters: input.volumes.previous.distanceMeters,
      },
      variation: {
        activitesPourcent: input.volumes.variation.count,
        dureePourcent: input.volumes.variation.durationSeconds,
        distancePourcent: input.volumes.variation.distanceMeters,
      },
    },
    seances: buildSessions(input.occurrences, input.linkedDetails),
    activitesNonPlanifiees: buildUnplanned(input.activities, input.occurrences),
  };
}

/** Compte les séances par statut et totalise le plan (les séances annulées ne comptent pas dans le plan). */
export function plannedSummary(
  occurrences: readonly WeekSessionOccurrence[],
): PlannedSummaryDto {
  const planned = occurrences.filter((o) => o.status !== 'annulee');
  return {
    seancesPrevues: planned.length,
    seancesRealisees: countStatus(occurrences, 'realisee'),
    seancesManquees: countStatus(occurrences, 'manquee'),
    seancesAnnulees: countStatus(occurrences, 'annulee'),
    dureePrevueMinutes: sum(planned.map((o) => o.durationMinutes)),
    distancePrevueMeters: sumOrNull(planned.map((o) => o.targetDistanceMeters)),
  };
}

/** Renvoie les séances avec leur plan et, si l'activité liée est du même jour, leur réalisé et leur atteinte. */
export function buildSessions(
  occurrences: readonly WeekSessionOccurrence[],
  linkedDetails: ReadonlyMap<string, WeekActivityDetail>,
): WeekExportSessionDto[] {
  return occurrences.map((occurrence) =>
    toSessionDto(occurrence, linkedDetails),
  );
}

/** Renvoie les activités qui ne sont liées à aucune séance des occurrences données, triées par date de début. */
export function buildUnplanned(
  activities: readonly WeekActivity[],
  occurrences: readonly WeekSessionOccurrence[],
): WeekExportActivityDto[] {
  const linkedIds = new Set(
    occurrences
      .map((o) => o.linkedActivityId)
      .filter((id): id is string => id !== null),
  );
  return activities
    .filter((activity) => !linkedIds.has(activity.id))
    .sort((a, b) => a.startedAt.getTime() - b.startedAt.getTime())
    .map((activity) => ({
      type: activity.type,
      startedAt: activity.startedAt,
      durationSeconds: activity.durationSeconds,
      distanceMeters: activity.distanceMeters,
      averageHeartRate: activity.averageHeartRate,
    }));
}

function toSessionDto(
  occurrence: WeekSessionOccurrence,
  linkedDetails: ReadonlyMap<string, WeekActivityDetail>,
): WeekExportSessionDto {
  const detail =
    occurrence.linkedActivityId === null
      ? undefined
      : linkedDetails.get(occurrence.linkedActivityId);
  const matched =
    detail !== undefined &&
    PARIS_DAY.format(detail.startedAt) === occurrence.date
      ? detail
      : undefined;
  return {
    sessionId: occurrence.sessionId,
    date: occurrence.date,
    startTime: occurrence.startTime,
    disciplineTypeKey: occurrence.disciplineTypeKey,
    statut: occurrence.status,
    plan: {
      durationMinutes: occurrence.durationMinutes,
      targetDistanceMeters: occurrence.targetDistanceMeters,
      targetHrZonePercentages: occurrence.targetHrZonePercentages,
      modules: occurrence.modules.map((module) => ({
        position: module.position,
        type: module.type,
        durationMinutes: module.durationMinutes,
        instruction: module.instruction,
        targetZones: module.targetZones,
        perceivedEffort: module.perceivedEffort,
      })),
    },
    realise:
      matched === undefined
        ? null
        : {
            type: matched.type,
            startedAt: matched.startedAt,
            durationSeconds: matched.durationSeconds,
            distanceMeters: matched.distanceMeters,
            averageHeartRate: matched.averageHeartRate,
            hrTimeInZone: matched.hrTimeInZone,
            perceivedEffort: matched.perceivedEffort,
            feeling: matched.feeling,
          },
    atteinte:
      matched === undefined || occurrence.achievement === null
        ? null
        : {
            distanceRate: occurrence.achievement.distanceRate,
            durationRate: occurrence.achievement.durationRate,
            zoneGapsPoints: occurrence.achievement.zoneGapsPoints,
          },
  };
}

function countStatus(
  occurrences: readonly WeekSessionOccurrence[],
  status: string,
): number {
  return occurrences.filter((o) => o.status === status).length;
}

function sum(values: readonly number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

function sumOrNull(values: readonly (number | null)[]): number | null {
  const present = values.filter((value): value is number => value !== null);
  return present.length === 0 ? null : sum(present);
}
