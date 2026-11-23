import type { SessionAchievement } from '../../domain/services/session-achievement.js';
import type {
  Session,
  SessionChangeLogEntry,
} from '../../domain/entities/session.entity.js';
import type { ModuleType } from '../../domain/value-objects/module-type.vo.js';
import type { SessionCarbsUnit } from '../../domain/value-objects/session-nutrition.vo.js';
import type { SessionRecurrence } from '../../domain/value-objects/session-recurrence.vo.js';
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
  targetDistanceMeters?: number | null;
  targetHrZonePercentages?: number[];
  carbsGrams?: number | null;
  carbsUnit?: SessionCarbsUnit | null;
  hydrationMilliliters?: number | null;
  date: string;
  disciplineTypeKey: string;
  durationMinutes: number;
  startTime: string;
  recurrence?: SessionRecurrence;
  description?: string | null;
  title?: string | null;
  modules?: SessionModuleInput[];
}

export interface UpdateSessionCommand {
  id: string;
  targetDistanceMeters?: number | null;
  targetHrZonePercentages?: number[];
  carbsGrams?: number | null;
  carbsUnit?: SessionCarbsUnit | null;
  hydrationMilliliters?: number | null;
  date?: string;
  disciplineTypeKey?: string;
  durationMinutes?: number;
  startTime?: string;
  recurrence?: SessionRecurrence;
  status?: string;
  description?: string | null;
  title?: string | null;
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

export type { SessionOccurrence as SessionOccurrenceDto } from '../../domain/services/session-occurrences.js';

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
    readonly startTime: string,
    readonly recurrence: SessionRecurrence,
    readonly status: SessionStatus,
    readonly modifiedManually: boolean,
    readonly description: string | null,
    readonly title: string | null,
    readonly modules: SessionModuleDto[],
    readonly changeLog: ChangeLogEntryDto[],
    readonly activity: SessionActivityLinkDto | null,
    readonly targetDistanceMeters: number | null,
    readonly targetHrZonePercentages: number[] | null,
    readonly carbsGrams: number | null,
    readonly carbsUnit: SessionCarbsUnit | null,
    readonly hydrationMilliliters: number | null,
    readonly achievement: SessionAchievement | null,
  ) {}

  static fromDomain(
    session: Session,
    achievement: SessionAchievement | null = null,
  ): SessionDto {
    const link = session.activityLink;
    return new SessionDto(
      session.id.toString(),
      session.date.toISOString().slice(0, 10),
      session.disciplineTypeKey,
      session.durationMinutes,
      session.startTime,
      session.recurrence,
      session.status,
      session.modifiedManually,
      session.description,
      session.title,
      session.modules.map((module) => module.toPrimitives()),
      session.changeLog,
      link === null
        ? null
        : { id: link.activityId, origin: link.origin, linkedAt: link.linkedAt },
      session.targetDistanceMeters,
      session.targetHrZonePercentages,
      session.carbsGrams,
      session.carbsUnit,
      session.hydrationMilliliters,
      achievement,
    );
  }
}
