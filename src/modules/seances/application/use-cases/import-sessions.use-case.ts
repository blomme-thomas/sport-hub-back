import { Inject, Injectable } from '@nestjs/common';
import { DomainError } from '../../../../shared/domain/domain-error.js';
import { Session } from '../../domain/entities/session.entity.js';
import { SessionImportAlreadyDoneError } from '../../domain/errors/session-import-already-done.error.js';
import {
  SessionImportInvalidError,
  type SessionImportIssue,
} from '../../domain/errors/session-import-invalid.error.js';
import {
  DISCIPLINE_CATALOG,
  type IDisciplineCatalog,
} from '../../domain/ports/outbound/discipline-catalog.port.js';
import {
  SEANCES_CLOCK,
  type SeancesClock,
} from '../../domain/ports/outbound/seances-clock.port.js';
import {
  SESSION_IMPORT_REPOSITORY,
  type ISessionImportRepository,
} from '../../domain/ports/outbound/session-import.repository.port.js';
import { SessionModule } from '../../domain/value-objects/session-module.vo.js';
import type { TargetZonesInput } from '../../domain/value-objects/target-zones.vo.js';
import {
  type ImportSessionsCommand,
  type ImportSessionsResultDto,
} from '../dtos/session-import.dto.js';
import {
  SESSION_IMPORT_KIND,
  SESSION_IMPORT_SCHEMA_VERSION,
} from '../session-import-format.js';
import { toCalendarDate } from '../session-inputs.js';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CALENDAR_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const SEANCE_FIELDS = [
  'date',
  'disciplineTypeKey',
  'durationMinutes',
  'startTime',
  'description',
  'equipment',
  'attentionPoints',
  'modules',
];
const MODULE_FIELDS = [
  'type',
  'durationMinutes',
  'instruction',
  'targetZones',
  'perceivedEffort',
];

type Fields = Record<string, unknown>;

class ImportIssues {
  private readonly items: SessionImportIssue[] = [];

  add(field: string, code: string, message: string): void {
    this.items.push({ field, code, message });
  }

  get count(): number {
    return this.items.length;
  }

  get all(): SessionImportIssue[] {
    return this.items;
  }
}

function isRecord(value: unknown): value is Fields {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isCalendarDate(value: string): boolean {
  if (!CALENDAR_DATE_PATTERN.test(value)) {
    return false;
  }
  const date = new Date(`${value}T00:00:00.000Z`);
  return (
    !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
}

function rejectUnknownFields(
  fields: Fields,
  allowed: string[],
  path: string,
  issues: ImportIssues,
): void {
  for (const key of Object.keys(fields)) {
    if (!allowed.includes(key)) {
      issues.add(
        `${path}.${key}`,
        'SESSION_IMPORT_UNKNOWN_FIELD',
        'champ absent du format plan-seances',
      );
    }
  }
}

function readText(
  fields: Fields,
  key: string,
  path: string,
  issues: ImportIssues,
  optional: boolean,
): string | null {
  const value = fields[key];
  if (value === undefined || value === null) {
    if (!optional) {
      issues.add(
        `${path}.${key}`,
        'SESSION_IMPORT_FIELD_MISSING',
        'champ obligatoire',
      );
    }
    return null;
  }
  if (typeof value !== 'string') {
    issues.add(
      `${path}.${key}`,
      'SESSION_IMPORT_FIELD_TYPE',
      'doit être une chaîne de caractères',
    );
    return null;
  }
  return value;
}

function readNumber(
  fields: Fields,
  key: string,
  path: string,
  issues: ImportIssues,
  optional: boolean,
): number | null {
  const value = fields[key];
  if (value === undefined || value === null) {
    if (!optional) {
      issues.add(
        `${path}.${key}`,
        'SESSION_IMPORT_FIELD_MISSING',
        'champ obligatoire',
      );
    }
    return null;
  }
  if (typeof value !== 'number') {
    issues.add(
      `${path}.${key}`,
      'SESSION_IMPORT_FIELD_TYPE',
      'doit être un nombre',
    );
    return null;
  }
  return value;
}

function domainIssue(error: unknown, path: string, issues: ImportIssues): null {
  if (error instanceof DomainError) {
    issues.add(path, error.code, error.message);
    return null;
  }
  throw error;
}

@Injectable()
export class ImportSessionsUseCase {
  constructor(
    @Inject(SESSION_IMPORT_REPOSITORY)
    private readonly imports: ISessionImportRepository,
    @Inject(DISCIPLINE_CATALOG)
    private readonly disciplines: IDisciplineCatalog,
    @Inject(SEANCES_CLOCK)
    private readonly clock: SeancesClock,
  ) {}

  /**
   * Ajoute au calendrier les séances d'un fichier `plan-seances`, toutes planifiées, sans rien modifier de l'existant. Le fichier est refusé en entier si une seule séance est invalide.
   *
   * @throws SessionImportInvalidError si l'enveloppe ou une séance est invalide ; la liste des erreurs indique chaque chemin fautif.
   * @throws SessionImportAlreadyDoneError si un fichier de même `importId` a déjà été importé.
   */
  async execute(
    command: ImportSessionsCommand,
  ): Promise<ImportSessionsResultDto> {
    const envelope = new ImportIssues();
    if (command.kind !== SESSION_IMPORT_KIND) {
      envelope.add(
        'kind',
        'SESSION_IMPORT_KIND_UNKNOWN',
        `doit être ${SESSION_IMPORT_KIND}`,
      );
    }
    if (command.schemaVersion !== SESSION_IMPORT_SCHEMA_VERSION) {
      envelope.add(
        'schemaVersion',
        'SESSION_IMPORT_VERSION_UNKNOWN',
        `doit être ${SESSION_IMPORT_SCHEMA_VERSION}`,
      );
    }
    if (
      typeof command.importId !== 'string' ||
      !UUID_PATTERN.test(command.importId)
    ) {
      envelope.add(
        'importId',
        'SESSION_IMPORT_ID_INVALID',
        'doit être un UUID',
      );
    }
    if (!Array.isArray(command.seances) || command.seances.length === 0) {
      envelope.add(
        'seances',
        'SESSION_IMPORT_EMPTY',
        'au moins une séance est attendue',
      );
    }
    if (envelope.count > 0) {
      throw new SessionImportInvalidError(envelope.all);
    }

    const importId = command.importId as string;
    if (await this.imports.exists(importId)) {
      throw new SessionImportAlreadyDoneError();
    }

    const issues = new ImportIssues();
    const sessions = await this.buildSessions(
      command.seances as unknown[],
      issues,
    );
    if (issues.count > 0) {
      throw new SessionImportInvalidError(issues.all);
    }

    await this.imports.saveAll(
      { importId, importedAt: this.clock(), sessionCount: sessions.length },
      sessions,
    );
    return {
      importId,
      createdCount: sessions.length,
      sessionIds: sessions.map((session) => session.id.toString()),
    };
  }

  private async buildSessions(
    rawSeances: unknown[],
    issues: ImportIssues,
  ): Promise<Session[]> {
    const knownKeys = new Map<string, boolean>();
    const sessions: Session[] = [];
    for (const [index, raw] of rawSeances.entries()) {
      const session = await this.buildSession(
        raw,
        `seances[${index}]`,
        knownKeys,
        issues,
      );
      if (session !== null) {
        sessions.push(session);
      }
    }
    return sessions;
  }

  private async buildSession(
    raw: unknown,
    path: string,
    knownKeys: Map<string, boolean>,
    issues: ImportIssues,
  ): Promise<Session | null> {
    if (!isRecord(raw)) {
      issues.add(
        path,
        'SESSION_IMPORT_SEANCE_INVALID',
        'une séance doit être un objet',
      );
      return null;
    }
    const before = issues.count;
    rejectUnknownFields(raw, SEANCE_FIELDS, path, issues);

    const date = readText(raw, 'date', path, issues, false);
    if (date !== null && !isCalendarDate(date)) {
      issues.add(
        `${path}.date`,
        'SESSION_IMPORT_DATE_INVALID',
        'doit être une date calendaire au format AAAA-MM-JJ',
      );
    }
    const disciplineTypeKey = readText(
      raw,
      'disciplineTypeKey',
      path,
      issues,
      false,
    );
    const durationMinutes = readNumber(
      raw,
      'durationMinutes',
      path,
      issues,
      false,
    );
    const startTime = readText(raw, 'startTime', path, issues, true);
    const description = readText(raw, 'description', path, issues, true);
    const equipment = readText(raw, 'equipment', path, issues, true);
    const attentionPoints = readText(
      raw,
      'attentionPoints',
      path,
      issues,
      true,
    );

    const rawModules = raw.modules;
    if (!Array.isArray(rawModules) || rawModules.length === 0) {
      issues.add(
        `${path}.modules`,
        'SESSION_IMPORT_MODULES_MISSING',
        'au moins un module est attendu',
      );
    }
    const modules = Array.isArray(rawModules)
      ? rawModules
          .map((rawModule, moduleIndex) =>
            this.buildModule(
              rawModule,
              `${path}.modules[${moduleIndex}]`,
              moduleIndex + 1,
              issues,
            ),
          )
          .filter((module): module is SessionModule => module !== null)
      : [];

    if (issues.count > before) {
      return null;
    }
    if (
      date === null ||
      disciplineTypeKey === null ||
      durationMinutes === null
    ) {
      return null;
    }
    if (!(await this.isKnownDiscipline(disciplineTypeKey, knownKeys))) {
      issues.add(
        `${path}.disciplineTypeKey`,
        'SESSION_DISCIPLINE_UNKNOWN',
        'discipline absente du référentiel',
      );
      return null;
    }

    try {
      return Session.create({
        date: toCalendarDate(date),
        disciplineTypeKey,
        durationMinutes,
        startTime,
        description,
        equipment,
        attentionPoints,
        modules,
      });
    } catch (error) {
      return domainIssue(error, path, issues);
    }
  }

  private buildModule(
    raw: unknown,
    path: string,
    position: number,
    issues: ImportIssues,
  ): SessionModule | null {
    if (!isRecord(raw)) {
      issues.add(
        path,
        'SESSION_IMPORT_MODULE_INVALID',
        'un module doit être un objet',
      );
      return null;
    }
    const before = issues.count;
    rejectUnknownFields(raw, MODULE_FIELDS, path, issues);
    const type = readText(raw, 'type', path, issues, false);
    const durationMinutes = readNumber(
      raw,
      'durationMinutes',
      path,
      issues,
      false,
    );
    const instruction = readText(raw, 'instruction', path, issues, false);
    const targetZones = raw.targetZones ?? null;
    if (targetZones !== null && !isRecord(targetZones)) {
      issues.add(
        `${path}.targetZones`,
        'SESSION_IMPORT_FIELD_TYPE',
        'doit être un objet',
      );
    }
    const perceivedEffort = readNumber(
      raw,
      'perceivedEffort',
      path,
      issues,
      true,
    );
    if (issues.count > before) {
      return null;
    }
    if (type === null || durationMinutes === null || instruction === null) {
      return null;
    }
    try {
      return SessionModule.create({
        position,
        type,
        durationMinutes,
        instruction,
        targetZones: targetZones as TargetZonesInput | null,
        perceivedEffort,
      });
    } catch (error) {
      return domainIssue(error, path, issues);
    }
  }

  private async isKnownDiscipline(
    typeKey: string,
    knownKeys: Map<string, boolean>,
  ): Promise<boolean> {
    const cached = knownKeys.get(typeKey);
    if (cached !== undefined) {
      return cached;
    }
    const known = await this.disciplines.exists(typeKey);
    knownKeys.set(typeKey, known);
    return known;
  }
}
