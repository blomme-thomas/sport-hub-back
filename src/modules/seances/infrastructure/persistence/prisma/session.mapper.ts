import {
  type ActivityLinkOrigin,
  Session,
} from '../../../domain/entities/session.entity.js';
import { SessionId } from '../../../domain/value-objects/session-id.vo.js';
import type { SessionRecurrence } from '../../../domain/value-objects/session-recurrence.vo.js';
import {
  SessionModule,
  type SessionModulePrimitives,
} from '../../../domain/value-objects/session-module.vo.js';
import type { TargetZonesInput } from '../../../domain/value-objects/target-zones.vo.js';

export interface SessionModuleRecord {
  position: number;
  type: string;
  durationMinutes: number;
  instruction: string;
  targetZones: unknown;
  perceivedEffort: number | null;
}

export interface SessionChangeLogRecord {
  changedAt: Date;
  field: string;
  previousValue: string | null;
}

export interface SessionActivityLinkRecord {
  activityId: string;
  origin: string;
  linkedAt: Date;
}

export interface SessionRecord {
  id: string;
  date: Date;
  disciplineTypeKey: string;
  durationMinutes: number;
  startTime?: string | null;
  recurrence: string;
  status: string;
  modifiedManually: boolean;
  description: string | null;
  equipment: string | null;
  attentionPoints: string | null;
  modules: SessionModuleRecord[];
  changeLogs: SessionChangeLogRecord[];
  activityLink?: SessionActivityLinkRecord | null;
}

export interface SessionPersistence {
  id: string;
  date: Date;
  disciplineTypeKey: string;
  durationMinutes: number;
  startTime?: string | null;
  recurrence: string;
  status: string;
  modifiedManually: boolean;
  description: string | null;
  equipment: string | null;
  attentionPoints: string | null;
  modules: SessionModulePrimitives[];
  activityLink: SessionActivityLinkRecord | null;
}

export class SessionMapper {
  static toDomain(record: SessionRecord): Session {
    return Session.reconstitute({
      id: SessionId.create(record.id),
      date: record.date,
      disciplineTypeKey: record.disciplineTypeKey,
      durationMinutes: record.durationMinutes,
      startTime: record.startTime,
      recurrence: record.recurrence as SessionRecurrence,
      status: record.status,
      modifiedManually: record.modifiedManually,
      activityLink: record.activityLink
        ? {
            activityId: record.activityLink.activityId,
            origin: record.activityLink.origin as ActivityLinkOrigin,
            linkedAt: record.activityLink.linkedAt,
          }
        : null,
      description: record.description,
      equipment: record.equipment,
      attentionPoints: record.attentionPoints,
      modules: record.modules.map((module) =>
        SessionModule.create({
          position: module.position,
          type: module.type,
          durationMinutes: module.durationMinutes,
          instruction: module.instruction,
          targetZones: (module.targetZones ?? null) as TargetZonesInput | null,
          perceivedEffort: module.perceivedEffort,
        }),
      ),
      changeLog: record.changeLogs.map((entry) => ({
        changedAt: entry.changedAt,
        field: entry.field,
        previousValue: entry.previousValue,
      })),
    });
  }

  static toPersistence(session: Session): SessionPersistence {
    return {
      id: session.id.toString(),
      date: session.date,
      disciplineTypeKey: session.disciplineTypeKey,
      durationMinutes: session.durationMinutes,
      startTime: session.startTime,
      recurrence: session.recurrence,
      status: session.status,
      modifiedManually: session.modifiedManually,
      description: session.description,
      equipment: session.equipment,
      attentionPoints: session.attentionPoints,
      modules: session.modules.map((module) => module.toPrimitives()),
      activityLink: session.activityLink,
    };
  }
}
