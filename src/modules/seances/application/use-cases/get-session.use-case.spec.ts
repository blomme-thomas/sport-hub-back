import { Test } from '@nestjs/testing';
import { Session } from '../../domain/entities/session.entity.js';
import { SessionNotFoundError } from '../../domain/errors/session-not-found.error.js';
import {
  SESSION_REPOSITORY,
  type ISessionRepository,
} from '../../domain/ports/outbound/session.repository.port.js';
import { SessionId } from '../../domain/value-objects/session-id.vo.js';
import { SessionModule } from '../../domain/value-objects/session-module.vo.js';
import { GetSessionUseCase } from './get-session.use-case.js';

const UNKNOWN_ID = '3f2504e0-4f89-41d3-9a0c-0305e82c3301';
const SESSION_ID = '0f8fad5b-d9cb-469f-a165-70867728950e';
const CHANGED_AT = new Date('2026-11-08T10:00:00.000Z');

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

describe('GetSessionUseCase', () => {
  let useCase: GetSessionUseCase;
  let repository: FakeSessionRepository;

  beforeEach(async () => {
    repository = new FakeSessionRepository();
    const session = Session.reconstitute({
      id: SessionId.create(SESSION_ID),
      date: new Date('2026-05-04T00:00:00.000Z'),
      disciplineTypeKey: 'swimming',
      durationMinutes: 45,
      status: 'planifiee',
      modifiedManually: true,
      description: 'Endurance',
      equipment: null,
      attentionPoints: null,
      modules: [
        SessionModule.create({
          position: 1,
          type: 'echauffement',
          durationMinutes: 10,
          instruction: 'Nage souple',
        }),
        SessionModule.create({
          position: 2,
          type: 'series',
          durationMinutes: 20,
          instruction: '4 x 100 m',
          targetZones: { pace: { min: 100, max: 110 } },
          perceivedEffort: 7,
        }),
      ],
      changeLog: [
        {
          changedAt: CHANGED_AT,
          field: 'durationMinutes',
          previousValue: '60',
        },
      ],
    });
    repository.sessions.set(SESSION_ID, session);
    const moduleRef = await Test.createTestingModule({
      providers: [
        GetSessionUseCase,
        { provide: SESSION_REPOSITORY, useValue: repository },
      ],
    }).compile();
    useCase = moduleRef.get(GetSessionUseCase);
  });

  it('renvoie la séance avec ses modules ordonnés et son journal', async () => {
    await expect(useCase.execute(SESSION_ID)).resolves.toEqual({
      id: SESSION_ID,
      date: '2026-05-04',
      disciplineTypeKey: 'swimming',
      durationMinutes: 45,
      status: 'planifiee',
      modifiedManually: true,
      description: 'Endurance',
      equipment: null,
      attentionPoints: null,
      modules: [
        {
          position: 1,
          type: 'echauffement',
          durationMinutes: 10,
          instruction: 'Nage souple',
          targetZones: null,
          perceivedEffort: null,
        },
        {
          position: 2,
          type: 'series',
          durationMinutes: 20,
          instruction: '4 x 100 m',
          targetZones: { pace: { min: 100, max: 110 } },
          perceivedEffort: 7,
        },
      ],
      changeLog: [
        {
          changedAt: CHANGED_AT,
          field: 'durationMinutes',
          previousValue: '60',
        },
      ],
    });
  });

  it('refuse un identifiant inconnu avec SESSION_NOT_FOUND', async () => {
    await expect(useCase.execute(UNKNOWN_ID)).rejects.toBeInstanceOf(
      SessionNotFoundError,
    );
    await expect(useCase.execute(UNKNOWN_ID)).rejects.toMatchObject({
      code: 'SESSION_NOT_FOUND',
    });
  });
});
