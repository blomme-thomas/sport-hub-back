export interface ImportSessionsCommand {
  kind?: unknown;
  schemaVersion?: unknown;
  importId?: unknown;
  seances?: unknown;
}

export interface ImportSessionsResultDto {
  importId: string;
  createdCount: number;
  sessionIds: string[];
}
