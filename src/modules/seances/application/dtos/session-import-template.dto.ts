export type SessionImportTemplateModuleDto = {
  type: string;
  durationMinutes: number;
  instruction: string;
  targetZones: Record<string, { min: number; max: number }>;
  perceivedEffort: string;
};

export type SessionImportTemplateSessionDto = {
  date: string;
  disciplineTypeKey: string;
  durationMinutes: number;
  startTime: string;
  description: string;
  equipment: string;
  attentionPoints: string;
  modules: SessionImportTemplateModuleDto[];
};

export type SessionImportTemplateDto = {
  kind: string;
  schemaVersion: number;
  importId: string;
  seances: SessionImportTemplateSessionDto[];
};
