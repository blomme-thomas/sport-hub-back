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
  targetDistanceMeters?: number | null;
  targetHrZone1?: number | null;
  targetHrZone2?: number | null;
  targetHrZone3?: number | null;
  targetHrZone4?: number | null;
  targetHrZone5?: number | null;
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
  targetDistanceMeters: number | null;
  targetHrZone1: number | null;
  targetHrZone2: number | null;
  targetHrZone3: number | null;
  targetHrZone4: number | null;
  targetHrZone5: number | null;
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
      targetDistanceMeters: record.targetDistanceMeters ?? null,
      targetHrZonePercentages: zonesOf(record),
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
      targetDistanceMeters: session.targetDistanceMeters,
      ...zoneColumnsOf(session.targetHrZonePercentages),
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

function zonesOf(record: SessionRecord): number[] | null {
  const zones = [
    record.targetHrZone1,
    record.targetHrZone2,
    record.targetHrZone3,
    record.targetHrZone4,
    record.targetHrZone5,
  ];
  return zones.every((value) => typeof value === 'number')
    ? (zones as number[])
    : null;
}

function zoneColumnsOf(zones: number[] | null) {
  return {
    targetHrZone1: zones?.[0] ?? null,
    targetHrZone2: zones?.[1] ?? null,
    targetHrZone3: zones?.[2] ?? null,
    targetHrZone4: zones?.[3] ?? null,
    targetHrZone5: zones?.[4] ?? null,
  };
}
