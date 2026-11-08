import { Test } from '@nestjs/testing';
import { Session } from '../../domain/entities/session.entity.js';
import { InvalidSessionError } from '../../domain/errors/invalid-session.error.js';
import {
  SESSION_REPOSITORY,
  type ISessionRepository,
} from '../../domain/ports/outbound/session.repository.port.js';
import type { SessionId } from '../../domain/value-objects/session-id.vo.js';
import { ListSessionsUseCase } from './list-sessions.use-case.js';

function day(iso: string): Date {
  return new Date(`${iso}T00:00:00.000Z`);
}

function seance(date: string): Session {
  return Session.create({
    date: day(date),
    disciplineTypeKey: 'swimming',
    durationMinutes: 60,
  });
}

class FakeSessionRepository implements ISessionRepository {
  readonly sessions = new Map<string, Session>();
  lastPeriod: { from: Date; to: Date } | null = null;

  findById(id: SessionId): Promise<Session | null> {
    return Promise.resolve(this.sessions.get(id.toString()) ?? null);
  }

  findByPeriod(period: { from: Date; to: Date }): Promise<Session[]> {
    this.lastPeriod = period;
    return Promise.resolve(
      [...this.sessions.values()].filter(
        (session) =>
          session.date.getTime() >= period.from.getTime() &&
          session.date.getTime() <= period.to.getTime(),
      ),
    );
  }

  findByActivityIds(activityIds: string[]): Promise<Session[]> {
    return Promise.resolve(
      [...this.sessions.values()].filter((session) =>
        activityIds.includes(session.activityLink?.activityId ?? ''),
      ),
    );
  }

  save(session: Session): Promise<void> {
    this.sessions.set(session.id.toString(), session);
    return Promise.resolve();
  }

  delete(id: SessionId): Promise<void> {
    this.sessions.delete(id.toString());
    return Promise.resolve();
  }
}

describe('ListSessionsUseCase', () => {
  let useCase: ListSessionsUseCase;
  let repository: FakeSessionRepository;

  beforeEach(async () => {
    repository = new FakeSessionRepository();
    const moduleRef = await Test.createTestingModule({
      providers: [
        ListSessionsUseCase,
        { provide: SESSION_REPOSITORY, useValue: repository },
      ],
    }).compile();
    useCase = moduleRef.get(ListSessionsUseCase);
  });

  describe('période', () => {
    beforeEach(() => {
      for (const date of [
        '2026-04-30',
        '2026-05-01',
        '2026-05-15',
        '2026-05-31',
        '2026-06-01',
      ]) {
        const session = seance(date);
        repository.sessions.set(session.id.toString(), session);
      }
    });

    it('renvoie les séances dont la date est comprise entre from et to, bornes incluses', async () => {
      const result = await useCase.execute({
        from: '2026-05-01',
        to: '2026-05-31',
      });

      expect(result.map((s) => s.date).sort()).toEqual([
        '2026-05-01',
        '2026-05-15',
        '2026-05-31',
      ]);
    });

    it('transmet au dépôt la période en dates UTC de minuit', async () => {
      await useCase.execute({ from: '2026-05-01', to: '2026-05-31' });

      expect(repository.lastPeriod).toEqual({
        from: day('2026-05-01'),
        to: day('2026-05-31'),
      });
    });

    it('renvoie les séances d’un jour unique quand from et to sont identiques', async () => {
      const result = await useCase.execute({
        from: '2026-05-15',
        to: '2026-05-15',
      });

      expect(result.map((s) => s.date)).toEqual(['2026-05-15']);
    });

    it('renvoie une liste vide quand aucune séance ne tombe dans la période', async () => {
      await expect(
        useCase.execute({ from: '2026-07-01', to: '2026-07-31' }),
      ).resolves.toEqual([]);
    });

    it('renvoie chaque séance au format de l’application avec sa date au format calendaire', async () => {
      const result = await useCase.execute({
        from: '2026-05-15',
        to: '2026-05-15',
      });

      expect(result).toEqual([
        expect.objectContaining({
          id: expect.any(String),
          date: '2026-05-15',
          disciplineTypeKey: 'swimming',
          durationMinutes: 60,
          status: 'planifiee',
          modifiedManually: false,
          modules: [],
          changeLog: [],
        }),
      ]);
    });
  });

  describe('bornes de la période', () => {
    it('accepte une période de 366 jours inclusifs', async () => {
      await expect(
        useCase.execute({ from: '2026-01-01', to: '2027-01-01' }),
      ).resolves.toEqual([]);
    });

    it('refuse une période de 367 jours avec SESSION_INVALID', async () => {
      await expect(
        useCase.execute({ from: '2026-01-01', to: '2027-01-02' }),
      ).rejects.toBeInstanceOf(InvalidSessionError);
      await expect(
        useCase.execute({ from: '2026-01-01', to: '2027-01-02' }),
      ).rejects.toMatchObject({ code: 'SESSION_INVALID' });
    });

    it('refuse une date de fin antérieure à la date de début avec SESSION_INVALID', async () => {
      await expect(
        useCase.execute({ from: '2026-05-31', to: '2026-05-01' }),
      ).rejects.toMatchObject({ code: 'SESSION_INVALID' });
    });
  });
});
