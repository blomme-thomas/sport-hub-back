export interface PlannedZoneRange {
  min: number;
  max: number;
}

export interface PlannedTargetZones {
  heartRate?: PlannedZoneRange;
  pace?: PlannedZoneRange;
  power?: PlannedZoneRange;
}

export interface PlannedModule {
  type: string;
  durationMinutes: number;
  instruction: string;
  targetZones: PlannedTargetZones | null;
  perceivedEffort: number | null;
}

/** Séance proposée par la génération, avant contrôle : jour calendaire, discipline et modules ordonnés. */
export interface PlannedSession {
  date: string;
  disciplineTypeKey: string;
  durationMinutes: number;
  modules: PlannedModule[];
}
