import type { Session } from '../domain/entities/session.entity.js';
import { InvalidSessionError } from '../domain/errors/invalid-session.error.js';
import { SessionNotFoundError } from '../domain/errors/session-not-found.error.js';
import type { ISessionRepository } from '../domain/ports/outbound/session.repository.port.js';
import { SessionId } from '../domain/value-objects/session-id.vo.js';
import { SessionModule } from '../domain/value-objects/session-module.vo.js';
import type { SessionModuleInput } from './dtos/session.dto.js';

export function toCalendarDate(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

const MAX_PERIOD_DAYS = 365;
const DAY_IN_MILLISECONDS = 24 * 60 * 60 * 1000;

export function assertPeriod(from: Date, to: Date): void {
  const elapsedDays = (to.getTime() - from.getTime()) / DAY_IN_MILLISECONDS;
  if (elapsedDays < 0) {
    throw new InvalidSessionError(
      'la date de fin de la période précède la date de début',
    );
  }
  if (elapsedDays > MAX_PERIOD_DAYS) {
    throw new InvalidSessionError(
      `la période dépasse ${MAX_PERIOD_DAYS + 1} jours`,
    );
  }
}

export function buildSessionModules(
  inputs: SessionModuleInput[],
): SessionModule[] {
  return inputs.map((input, index) =>
    SessionModule.create({
      position: index + 1,
      type: input.type,
      durationMinutes: input.durationMinutes,
      instruction: input.instruction,
      targetZones: input.targetZones,
      perceivedEffort: input.perceivedEffort,
    }),
  );
}

export async function loadSession(
  sessions: ISessionRepository,
  id: string,
): Promise<Session> {
  const session = await sessions.findById(SessionId.create(id));
  if (session === null) {
    throw new SessionNotFoundError();
  }
  return session;
}
