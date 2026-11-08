import type {
  Session,
  SessionChangeLogEntry,
} from '../../domain/entities/session.entity.js';
import type { ModuleType } from '../../domain/value-objects/module-type.vo.js';
import type { SessionStatus } from '../../domain/value-objects/session-status.vo.js';
import type { TargetZonesInput } from '../../domain/value-objects/target-zones.vo.js';

export interface SessionModuleInput {
  type: string;
  durationMinutes: number;
  instruction: string;
  targetZones?: TargetZonesInput | null;
  perceivedEffort?: number | null;
}

export interface CreateSessionCommand {
  date: string;
  disciplineTypeKey: string;
  durationMinutes: number;
  description?: string | null;
  equipment?: string | null;
  attentionPoints?: string | null;
  modules?: SessionModuleInput[];
}

export interface UpdateSessionCommand {
  id: string;
  date?: string;
  disciplineTypeKey?: string;
  durationMinutes?: number;
  status?: string;
  description?: string | null;
  equipment?: string | null;
  attentionPoints?: string | null;
}

export interface ReplaceSessionModulesCommand {
  id: string;
  modules: SessionModuleInput[];
}

export interface ListSessionsQuery {
  from: string;
  to: string;
}

export interface SessionModuleDto {
  position: number;
  type: ModuleType;
  durationMinutes: number;
  instruction: string;
  targetZones: TargetZonesInput | null;
  perceivedEffort: number | null;
}

export type ChangeLogEntryDto = SessionChangeLogEntry;

export class SessionDto {
  private constructor(
    readonly id: string,
    readonly date: string,
    readonly disciplineTypeKey: string,
    readonly durationMinutes: number,
    readonly status: SessionStatus,
    readonly modifiedManually: boolean,
    readonly description: string | null,
    readonly equipment: string | null,
    readonly attentionPoints: string | null,
    readonly modules: SessionModuleDto[],
    readonly changeLog: ChangeLogEntryDto[],
  ) {}

  static fromDomain(session: Session): SessionDto {
    return new SessionDto(
      session.id.toString(),
      session.date.toISOString().slice(0, 10),
      session.disciplineTypeKey,
      session.durationMinutes,
      session.status,
      session.modifiedManually,
      session.description,
      session.equipment,
      session.attentionPoints,
      session.modules.map((module) => module.toPrimitives()),
      session.changeLog,
    );
  }
}
