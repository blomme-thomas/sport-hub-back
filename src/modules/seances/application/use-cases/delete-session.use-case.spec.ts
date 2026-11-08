import { Test } from '@nestjs/testing';
import { Session } from '../../domain/entities/session.entity.js';
import { SessionNotFoundError } from '../../domain/errors/session-not-found.error.js';
import {
  SESSION_REPOSITORY,
  type ISessionRepository,
} from '../../domain/ports/outbound/session.repository.port.js';
import { SessionId } from '../../domain/value-objects/session-id.vo.js';
import { DeleteSessionUseCase } from './delete-session.use-case.js';

const UNKNOWN_ID = '3f2504e0-4f89-41d3-9a0c-0305e82c3301';

class FakeSessionRepository implements ISessionRepository {
  readonly sessions = new Map<string, Session>();

  findById(id: SessionId): Promise<Session | null> {
    return Promise.resolve(this.sessions.get(id.toString()) ?? null);
  }

  findByPeriod(): Promise<Session[]> {
    return Promise.resolve([...this.sessions.values()]);
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

function seance(): Session {
  return Session.create({
    date: new Date('2026-05-04T00:00:00.000Z'),
    disciplineTypeKey: 'swimming',
    durationMinutes: 60,
  });
}

describe('DeleteSessionUseCase', () => {
  let useCase: DeleteSessionUseCase;
  let repository: FakeSessionRepository;
  let session: Session;
  let id: string;

  beforeEach(async () => {
    repository = new FakeSessionRepository();
    session = seance();
    id = session.id.toString();
    await repository.save(session);
    const moduleRef = await Test.createTestingModule({
      providers: [
        DeleteSessionUseCase,
        { provide: SESSION_REPOSITORY, useValue: repository },
      ],
    }).compile();
    useCase = moduleRef.get(DeleteSessionUseCase);
  });

  it('supprime la séance existante', async () => {
    await useCase.execute(id);

    expect(repository.sessions.has(id)).toBe(false);
    expect(repository.sessions.size).toBe(0);
  });

  it('ne supprime que la séance désignée', async () => {
    const other = seance();
    await repository.save(other);

    await useCase.execute(id);

    expect(repository.sessions.size).toBe(1);
    expect(repository.sessions.has(other.id.toString())).toBe(true);
  });

  it('supprime une séance réalisée', async () => {
    const completed = Session.reconstitute({
      id: SessionId.generate(),
      date: new Date('2026-05-04T00:00:00.000Z'),
      disciplineTypeKey: 'swimming',
      durationMinutes: 60,
      status: 'realisee',
      modifiedManually: false,
      description: null,
      equipment: null,
      attentionPoints: null,
      modules: [],
      changeLog: [],
    });
    await repository.save(completed);

    await useCase.execute(completed.id.toString());

    expect(repository.sessions.has(completed.id.toString())).toBe(false);
  });

  it('refuse un identifiant inconnu avec SESSION_NOT_FOUND sans rien supprimer', async () => {
    await expect(useCase.execute(UNKNOWN_ID)).rejects.toBeInstanceOf(
      SessionNotFoundError,
    );
    await expect(useCase.execute(UNKNOWN_ID)).rejects.toMatchObject({
      code: 'SESSION_NOT_FOUND',
    });

    expect(repository.sessions.has(id)).toBe(true);
  });

  it('refuse une seconde suppression de la même séance avec SESSION_NOT_FOUND', async () => {
    await useCase.execute(id);

    await expect(useCase.execute(id)).rejects.toMatchObject({
      code: 'SESSION_NOT_FOUND',
    });
  });
});
