import type { Session } from '../domain/entities/session.entity.js';
import { SessionNotFoundError } from '../domain/errors/session-not-found.error.js';
import type { ISessionRepository } from '../domain/ports/outbound/session.repository.port.js';
import { SessionId } from '../domain/value-objects/session-id.vo.js';
import { SessionModule } from '../domain/value-objects/session-module.vo.js';
import type { SessionModuleInput } from './dtos/session.dto.js';

export function toCalendarDate(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
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
