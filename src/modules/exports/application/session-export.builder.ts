import type {
  WeekActivityDetail,
  WeekSessionOccurrence,
} from '../domain/ports/outbound/week-export.ports.js';
import {
  buildSessions,
  type WeekExportSessionDto,
} from './week-export.builder.js';

export const SESSION_EXPORT_FORMAT = 'bilan-seance';
export const SESSION_EXPORT_KIND = 'seance';
export const SESSION_EXPORT_SCHEMA_VERSION = 1;

export const SESSION_EXPORT_NOTES =
  'Fichier bilan-seance, version 1, pour une séance précise. ' +
  '`seance.plan` donne le plan (durée, distance et zones cibles, modules) et `seance.realise` l’activité réalisée rapprochée ' +
  '(null si la séance n’est pas rapprochée d’une activité, ou si l’activité n’est pas du même jour). ' +
  '`seance.atteinte` compare le réalisé au plan (taux en pourcentage, écarts par zone en points). ' +
  'Les durées sont en secondes, sauf `plan.durationMinutes` et `modules[].durationMinutes` ; les distances en mètres ; les dates en ISO 8601. ' +
  'Les zones de fréquence cardiaque sont numérotées de 1 à 5 et `hrTimeInZone` donne le temps passé dans chaque zone (unité supposée : secondes). ' +
  "Consigne d'analyse : compare le plan au réalisé et relève les écarts et points d'attention. " +
  "Ne donne pas d'avis médical.";

export interface SessionExportDto {
  format: typeof SESSION_EXPORT_FORMAT;
  kind: typeof SESSION_EXPORT_KIND;
  schemaVersion: typeof SESSION_EXPORT_SCHEMA_VERSION;
  notesPourLAnalyse: string;
  seance: WeekExportSessionDto;
}

/**
 * Assemble le fichier `bilan-seance`. Le bloc `seance` reprend le format du bloc `seances` de l'export hebdomadaire,
 * et le réalisé n'est repris que si l'activité rapprochée est du même jour que la séance.
 * Aucune donnée brute Garmin ni identifiant Garmin n'est repris.
 */
export function buildSessionExport(
  occurrence: WeekSessionOccurrence,
  linkedDetail: WeekActivityDetail | null,
): SessionExportDto {
  const linkedDetails = new Map<string, WeekActivityDetail>();
  if (linkedDetail !== null && occurrence.linkedActivityId !== null) {
    linkedDetails.set(occurrence.linkedActivityId, linkedDetail);
  }
  const [seance] = buildSessions([occurrence], linkedDetails);
  return {
    format: SESSION_EXPORT_FORMAT,
    kind: SESSION_EXPORT_KIND,
    schemaVersion: SESSION_EXPORT_SCHEMA_VERSION,
    notesPourLAnalyse: SESSION_EXPORT_NOTES,
    seance,
  };
}
