import { describe, expect, it } from 'vitest';
import { Session } from '../../domain/entities/session.entity.js';
import type { SessionOccurrenceException } from '../../domain/entities/session-occurrence-exception.js';
import { SessionOccurrenceNotFoundError } from '../../domain/errors/session-occurrence-not-found.error.js';
import type { ISessionOccurrenceExceptionRepository } from '../../domain/ports/outbound/session-occurrence-exception.repository.port.js';
import type { ISessionRepository } from '../../domain/ports/outbound/session.repository.port.js';
import type { SessionId } from '../../domain/value-objects/session-id.vo.js';
import { CancelSessionOccurrenceUseCase } from './cancel-session-occurrence.use-case.js';
import { MoveSessionOccurrenceUseCase } from './move-session-occurrence.use-case.js';
import { RestoreSessionOccurrenceUseCase } from './restore-session-occurrence.use-case.js';

const SERIES = Session.create({
  date: new Date('2026-11-02T00:00:00.000Z'),
  disciplineTypeKey: 'swimming',
  durationMinutes: 60,
  startTime: '18:00',
  recurrence: 'hebdomadaire',
});
const SERIES_ID = SERIES.id.toString();

const sessions = {
  async findById(id: SessionId): Promise<Session | null> {
    return id.toString() === SERIES_ID ? SERIES : null;
  },
} as unknown as ISessionRepository;

class FakeExceptions implements ISessionOccurrenceExceptionRepository {
  rows = new Map<string, SessionOccurrenceException>();

  private key(sessionId: string, date: Date): string {
    return `${sessionId}|${date.toISOString().slice(0, 10)}`;
  }

  async findBySessionAndDate(sessionId: string, date: Date) {
    return this.rows.get(this.key(sessionId, date)) ?? null;
  }
  async findBySessionIds(): Promise<SessionOccurrenceException[]> {
    return [...this.rows.values()];
  }
  async save(exception: SessionOccurrenceException): Promise<void> {
    this.rows.set(
      this.key(exception.sessionId, exception.occurrenceDate),
      exception,
    );
  }
  async delete(sessionId: string, date: Date): Promise<void> {
    this.rows.delete(this.key(sessionId, date));
  }
}

describe('MoveSessionOccurrenceUseCase', () => {
  it('déplace une occurrence et renvoie la nouvelle date et heure', async () => {
    const exceptions = new FakeExceptions();
    const useCase = new MoveSessionOccurrenceUseCase(sessions, exceptions);

    const occurrence = await useCase.execute({
      sessionId: SERIES_ID,
      occurrenceDate: '2026-11-16',
      date: '2026-11-17',
      startTime: '07:00',
    });

    expect(occurrence).toMatchObject({
      date: '2026-11-17',
      startTime: '07:00',
      status: 'planifiee',
    });
    expect(exceptions.rows.size).toBe(1);
  });

  it('garde l’heure de la série quand startTime est absent', async () => {
    const useCase = new MoveSessionOccurrenceUseCase(
      sessions,
      new FakeExceptions(),
    );

    const occurrence = await useCase.execute({
      sessionId: SERIES_ID,
      occurrenceDate: '2026-11-16',
      date: '2026-11-17',
    });

    expect(occurrence.startTime).toBe('18:00');
  });

  it('refuse une date qui n’est pas une occurrence de la série', async () => {
    const useCase = new MoveSessionOccurrenceUseCase(
      sessions,
      new FakeExceptions(),
    );

    await expect(
      useCase.execute({
        sessionId: SERIES_ID,
        occurrenceDate: '2026-11-17',
        date: '2026-11-18',
      }),
    ).rejects.toThrow(SessionOccurrenceNotFoundError);
  });
});

describe('CancelSessionOccurrenceUseCase', () => {
  it('annule une occurrence sans la retirer de la série', async () => {
    const useCase = new CancelSessionOccurrenceUseCase(
      sessions,
      new FakeExceptions(),
    );

    const occurrence = await useCase.execute({
      sessionId: SERIES_ID,
      occurrenceDate: '2026-11-16',
    });

    expect(occurrence).toMatchObject({ date: '2026-11-16', status: 'annulee' });
  });

  it('refuse une date hors série avec SessionOccurrenceNotFoundError', async () => {
    const useCase = new CancelSessionOccurrenceUseCase(
      sessions,
      new FakeExceptions(),
    );

    await expect(
      useCase.execute({ sessionId: SERIES_ID, occurrenceDate: '2026-11-17' }),
    ).rejects.toThrow(SessionOccurrenceNotFoundError);
  });
});

describe('RestoreSessionOccurrenceUseCase', () => {
  it('supprime l’exception pour revenir à la programmation de la série', async () => {
    const exceptions = new FakeExceptions();
    await new CancelSessionOccurrenceUseCase(sessions, exceptions).execute({
      sessionId: SERIES_ID,
      occurrenceDate: '2026-11-16',
    });

    await new RestoreSessionOccurrenceUseCase(sessions, exceptions).execute({
      sessionId: SERIES_ID,
      occurrenceDate: '2026-11-16',
    });

    expect(exceptions.rows.size).toBe(0);
  });
});
