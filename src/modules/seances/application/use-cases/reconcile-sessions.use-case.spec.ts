import { describe, expect, it } from 'vitest';
import { Session } from '../../domain/entities/session.entity.js';
import type { IActivityCatalog } from '../../domain/ports/outbound/activity-catalog.port.js';
import type { ISessionRepository } from '../../domain/ports/outbound/session.repository.port.js';
import { SessionId } from '../../domain/value-objects/session-id.vo.js';
import { ReconcileSessionsUseCase } from './reconcile-sessions.use-case.js';

const NOW = new Date('2026-11-12T20:00:00.000Z');

class FakeRepository implements ISessionRepository {
  readonly sessions = new Map<string, Session>();

  findById(id: SessionId): Promise<Session | null> {
    return Promise.resolve(this.sessions.get(id.toString()) ?? null);
  }

  findByPeriod(): Promise<Session[]> {
    return Promise.resolve([...this.sessions.values()]);
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

  delete(): Promise<void> {
    return Promise.resolve();
  }
}

function catalog(
  items: { id: string; type: string; localDate: string }[],
): IActivityCatalog {
  return { activitiesOnDays: () => Promise.resolve(items) };
}

function seance(): Session {
  return Session.create({
    date: new Date('2026-11-12T00:00:00.000Z'),
    disciplineTypeKey: 'running',
    durationMinutes: 45,
  });
}

describe('ReconcileSessionsUseCase', () => {
  it('lie automatiquement le cas sans ambiguïté et persiste la séance réalisée', async () => {
    const repository = new FakeRepository();
    const planned = seance();
    repository.sessions.set(planned.id.toString(), planned);
    const useCase = new ReconcileSessionsUseCase(
      repository,
      catalog([{ id: 'a1', type: 'running', localDate: '2026-11-12' }]),
      () => NOW,
    );

    const pairs = await useCase.execute({
      from: '2026-11-01',
      to: '2026-11-30',
    });

    expect(pairs).toEqual([
      { sessionId: planned.id.toString(), activityId: 'a1' },
    ]);
    const stored = repository.sessions.get(planned.id.toString());
    expect(stored?.status).toBe('realisee');
    expect(stored?.activityLink).toEqual({
      activityId: 'a1',
      origin: 'automatique',
      linkedAt: NOW,
    });
  });

  it('ne lie rien quand deux activités de même jour et discipline sont en concurrence', async () => {
    const repository = new FakeRepository();
    const planned = seance();
    repository.sessions.set(planned.id.toString(), planned);
    const useCase = new ReconcileSessionsUseCase(
      repository,
      catalog([
        { id: 'a1', type: 'running', localDate: '2026-11-12' },
        { id: 'a2', type: 'running', localDate: '2026-11-12' },
      ]),
      () => NOW,
    );

    expect(
      await useCase.execute({ from: '2026-11-01', to: '2026-11-30' }),
    ).toEqual([]);
    expect(repository.sessions.get(planned.id.toString())?.status).toBe(
      'planifiee',
    );
  });

  it('refuse une période inversée', async () => {
    const useCase = new ReconcileSessionsUseCase(
      new FakeRepository(),
      catalog([]),
      () => NOW,
    );

    await expect(
      useCase.execute({ from: '2026-11-30', to: '2026-11-01' }),
    ).rejects.toMatchObject({
      code: 'SESSION_INVALID',
    });
  });
});
