import { describe, expect, it } from 'vitest';
import { Session } from '../../domain/entities/session.entity.js';
import { SessionActivityAlreadyLinkedError } from '../../domain/errors/session-activity-already-linked.error.js';
import { SessionActivityNotFoundError } from '../../domain/errors/session-activity-not-found.error.js';
import type { IActivityCatalog } from '../../domain/ports/outbound/activity-catalog.port.js';
import type { ISessionRepository } from '../../domain/ports/outbound/session.repository.port.js';
import { SessionId } from '../../domain/value-objects/session-id.vo.js';
import { LinkSessionActivityUseCase } from './link-session-activity.use-case.js';

const NOW = new Date('2026-11-12T20:00:00.000Z');
const ACTIVITY_ID = '6b1b3a7e-2f4d-4c8e-9a51-0d7c2e8f9a10';

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

function catalog(activityIds: string[]): IActivityCatalog {
  return {
    activitiesOnDays: () =>
      Promise.resolve(
        activityIds.map((id) => ({
          id,
          type: 'running',
          localDate: '2026-11-12',
        })),
      ),
  };
}

function seance(): Session {
  return Session.create({
    date: new Date('2026-11-12T00:00:00.000Z'),
    disciplineTypeKey: 'running',
    durationMinutes: 45,
  });
}

describe('LinkSessionActivityUseCase', () => {
  it('lie une activité du même jour, en origine manuelle, et renvoie la séance réalisée', async () => {
    const repository = new FakeRepository();
    const planned = seance();
    repository.sessions.set(planned.id.toString(), planned);
    const useCase = new LinkSessionActivityUseCase(
      repository,
      catalog([ACTIVITY_ID]),
      () => NOW,
    );

    const dto = await useCase.execute({
      sessionId: planned.id.toString(),
      activityId: ACTIVITY_ID,
    });

    expect(dto.status).toBe('realisee');
    expect(dto.activity).toEqual({
      id: ACTIVITY_ID,
      origin: 'manuel',
      linkedAt: NOW,
    });
    expect(
      repository.sessions.get(planned.id.toString())?.activityLink?.activityId,
    ).toBe(ACTIVITY_ID);
  });

  it('refuse une activité qui n’existe pas à la date de la séance', async () => {
    const repository = new FakeRepository();
    const planned = seance();
    repository.sessions.set(planned.id.toString(), planned);
    const useCase = new LinkSessionActivityUseCase(
      repository,
      catalog([]),
      () => NOW,
    );

    await expect(
      useCase.execute({
        sessionId: planned.id.toString(),
        activityId: ACTIVITY_ID,
      }),
    ).rejects.toBeInstanceOf(SessionActivityNotFoundError);
  });

  it('refuse une activité déjà liée à une autre séance', async () => {
    const repository = new FakeRepository();
    const other = seance().linkActivity(ACTIVITY_ID, 'automatique', NOW);
    const target = seance();
    repository.sessions.set(other.id.toString(), other);
    repository.sessions.set(target.id.toString(), target);
    const useCase = new LinkSessionActivityUseCase(
      repository,
      catalog([ACTIVITY_ID]),
      () => NOW,
    );

    await expect(
      useCase.execute({
        sessionId: target.id.toString(),
        activityId: ACTIVITY_ID,
      }),
    ).rejects.toBeInstanceOf(SessionActivityAlreadyLinkedError);
  });
});
