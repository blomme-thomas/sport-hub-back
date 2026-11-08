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
  startTime?: string | null;
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
  startTime?: string | null;
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

export interface SessionActivityLinkDto {
  id: string;
  origin: string;
  linkedAt: Date;
}

export interface LinkSessionActivityCommand {
  sessionId: string;
  activityId: string;
}

export interface ReconcileSessionsQuery {
  from: string;
  to: string;
}

export class SessionDto {
  private constructor(
    readonly id: string,
    readonly date: string,
    readonly disciplineTypeKey: string,
    readonly durationMinutes: number,
    readonly startTime: string | null,
    readonly status: SessionStatus,
    readonly modifiedManually: boolean,
    readonly description: string | null,
    readonly equipment: string | null,
    readonly attentionPoints: string | null,
    readonly modules: SessionModuleDto[],
    readonly changeLog: ChangeLogEntryDto[],
    readonly activity: SessionActivityLinkDto | null,
  ) {}

  static fromDomain(session: Session): SessionDto {
    const link = session.activityLink;
    return new SessionDto(
      session.id.toString(),
      session.date.toISOString().slice(0, 10),
      session.disciplineTypeKey,
      session.durationMinutes,
      session.startTime,
      session.status,
      session.modifiedManually,
      session.description,
      session.equipment,
      session.attentionPoints,
      session.modules.map((module) => module.toPrimitives()),
      session.changeLog,
      link === null
        ? null
        : { id: link.activityId, origin: link.origin, linkedAt: link.linkedAt },
    );
  }
}
