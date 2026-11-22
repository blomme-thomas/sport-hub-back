import { calendarDay } from '../../../shared/domain/value-objects/calendar-day.js';
import type {
  WeekActivity,
  WeekActivityDetail,
  WeekSessionOccurrence,
} from '../domain/ports/outbound/week-export.ports.js';
import {
  buildSessions,
  buildUnplanned,
  plannedSummary,
  type PlannedSummaryDto,
  type WeekExportActivityDto,
  type WeekExportSessionDto,
} from './week-export.builder.js';

export const MONTH_EXPORT_KIND = 'bilan-mois';
export const MONTH_EXPORT_SCHEMA_VERSION = 1;

export const MONTH_EXPORT_NOTES =
  'Fichier bilan-mois, version 1, pour le mois calendaire indiqué dans `periode` (du premier au dernier jour). ' +
  '`semaines` regroupe les séances et activités du mois par semaine ISO (lundi au dimanche). ' +
  "Une semaine à cheval sur deux mois n'est reprise que pour les jours du mois : `partielle` vaut true et `premierJour`/`dernierJour` indiquent la part retenue. " +
  "Chaque séance et chaque activité du mois n'apparaît que dans une seule semaine. " +
  "`resume` totalise le mois. Il n'y a pas de comparaison avec le mois précédent. " +
  'Les durées sont en secondes, sauf `dureePrevueMinutes` et `plan.durationMinutes` ; les distances en mètres ; les dates en ISO 8601. ' +
  'Les zones de fréquence cardiaque sont numérotées de 1 à 5 et `hrTimeInZone` donne le temps passé dans chaque zone (unité supposée : secondes). ' +
  "Consigne d'analyse : compare le plan au réalisé sur le mois, relève la tendance de charge d'une semaine à l'autre, et signale les écarts et points d'attention. " +
  "Ne donne pas d'avis médical.";

export interface MonthWeek {
  label: string;
  monday: Date;
  sunday: Date;
}

export interface MonthExportInput {
  label: string;
  first: Date;
  last: Date;
  weeks: readonly MonthWeek[];
  occurrences: WeekSessionOccurrence[];
  activities: WeekActivity[];
  linkedDetails: ReadonlyMap<string, WeekActivityDetail>;
}

export interface MonthSummaryDto extends PlannedSummaryDto {
  dureeRealiseeSeconds: number;
  distanceRealiseeMeters: number;
  activitesRealisees: number;
}

export interface MonthExportWeekDto {
  semaine: string;
  premierJour: string;
  dernierJour: string;
  partielle: boolean;
  resume: MonthSummaryDto;
  seances: WeekExportSessionDto[];
  activitesNonPlanifiees: WeekExportActivityDto[];
}

export interface MonthExportDto {
  kind: typeof MONTH_EXPORT_KIND;
  schemaVersion: typeof MONTH_EXPORT_SCHEMA_VERSION;
  periode: { mois: string; premierJour: string; dernierJour: string };
  notesPourLAnalyse: string;
  resume: MonthSummaryDto;
  semaines: MonthExportWeekDto[];
}

/**
 * Assemble le fichier `bilan-mois`. Chaque semaine ISO du mois est restreinte aux jours du mois ;
 * une séance ou une activité est donc rattachée à une seule semaine, et une semaine qui déborde est marquée `partielle`.
 */
export function buildMonthExport(input: MonthExportInput): MonthExportDto {
  const first = calendarDay(input.first);
  const last = calendarDay(input.last);
  const inMonth = (day: string): boolean => day >= first && day <= last;
  const occurrences = input.occurrences.filter((o) => inMonth(o.date));
  const activities = input.activities.filter((a) =>
    inMonth(calendarDay(a.startedAt)),
  );
  return {
    kind: MONTH_EXPORT_KIND,
    schemaVersion: MONTH_EXPORT_SCHEMA_VERSION,
    periode: { mois: input.label, premierJour: first, dernierJour: last },
    notesPourLAnalyse: MONTH_EXPORT_NOTES,
    resume: summarize(occurrences, activities),
    semaines: input.weeks.map((week) => {
      const weekFirst = calendarDay(week.monday);
      const weekLast = calendarDay(week.sunday);
      const start = weekFirst > first ? weekFirst : first;
      const end = weekLast < last ? weekLast : last;
      const within = (day: string): boolean => day >= start && day <= end;
      const weekOccurrences = occurrences.filter((o) => within(o.date));
      const weekActivities = activities.filter((a) =>
        within(calendarDay(a.startedAt)),
      );
      return {
        semaine: week.label,
        premierJour: start,
        dernierJour: end,
        partielle: start !== weekFirst || end !== weekLast,
        resume: summarize(weekOccurrences, weekActivities),
        seances: buildSessions(weekOccurrences, input.linkedDetails),
        activitesNonPlanifiees: buildUnplanned(weekActivities, weekOccurrences),
      };
    }),
  };
}

function summarize(
  occurrences: readonly WeekSessionOccurrence[],
  activities: readonly WeekActivity[],
): MonthSummaryDto {
  return {
    ...plannedSummary(occurrences),
    dureeRealiseeSeconds: activities.reduce(
      (total, activity) => total + activity.durationSeconds,
      0,
    ),
    distanceRealiseeMeters: activities.reduce(
      (total, activity) => total + (activity.distanceMeters ?? 0),
      0,
    ),
    activitesRealisees: activities.length,
  };
}
