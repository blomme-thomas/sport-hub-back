import { Test } from '@nestjs/testing';
import { Session } from '../../domain/entities/session.entity.js';
import { InvalidSessionError } from '../../domain/errors/invalid-session.error.js';
import { InvalidSessionModuleError } from '../../domain/errors/invalid-session-module.error.js';
import { UnknownSessionDisciplineError } from '../../domain/errors/unknown-session-discipline.error.js';
import {
  SESSION_REPOSITORY,
  type ISessionRepository,
} from '../../domain/ports/outbound/session.repository.port.js';
import type { SessionId } from '../../domain/value-objects/session-id.vo.js';
import type {
  CreateSessionCommand,
  SessionModuleInput,
} from '../dtos/session.dto.js';
import { CreateSessionUseCase } from './create-session.use-case.js';

const CINQ_MODULES: SessionModuleInput[] = [
  { type: 'echauffement', durationMinutes: 10, instruction: 'Nage souple' },
  {
    type: 'educatifs',
    durationMinutes: 10,
    instruction: 'Battements jambes',
    targetZones: null,
    perceivedEffort: 3,
  },
  {
    type: 'series',
    durationMinutes: 20,
    instruction: '4 x 100 m',
    targetZones: { heartRate: { min: 140, max: 160 } },
    perceivedEffort: 7,
  },
  {
    type: 'series',
    durationMinutes: 10,
    instruction: '200 m récupération',
    perceivedEffort: 4,
  },
  {
    type: 'retour_au_calme',
    durationMinutes: 10,
    instruction: 'Nage lente',
    perceivedEffort: 2,
  },
];

const NATATION: CreateSessionCommand = {
  date: '2026-05-04',
  disciplineTypeKey: 'swimming',
  durationMinutes: 60,
  startTime: '08:00',
};

class FakeSessionRepository implements ISessionRepository {
  readonly sessions = new Map<string, Session>();

  findById(id: SessionId): Promise<Session | null> {
    return Promise.resolve(this.sessions.get(id.toString()) ?? null);
  }

  findByPeriod(period: { from: Date; to: Date }): Promise<Session[]> {
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

  findOccurrenceCandidates(): Promise<Session[]> {
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

function captureError(action: () => Promise<unknown>): Promise<unknown> {
  return action().then(
    () => {
      throw new Error('aucune erreur levée');
    },
    (error: unknown) => error,
  );
}

describe('CreateSessionUseCase', () => {
  let useCase: CreateSessionUseCase;
  let repository: FakeSessionRepository;

  beforeEach(async () => {
    repository = new FakeSessionRepository();
    const moduleRef = await Test.createTestingModule({
      providers: [
        CreateSessionUseCase,
        { provide: SESSION_REPOSITORY, useValue: repository },
      ],
    }).compile();
    useCase = moduleRef.get(CreateSessionUseCase);
  });

  describe('création réussie', () => {
    it('renvoie une séance planifiée non modifiée manuellement, sans modules ni journal', async () => {
      await expect(useCase.execute(NATATION)).resolves.toEqual({
        id: expect.any(String),
        date: '2026-05-04',
        disciplineTypeKey: 'swimming',
        durationMinutes: 60,
        startTime: '08:00',
        recurrence: 'aucune',
        targetDistanceMeters: null,
        targetHrZonePercentages: null,
        carbsGrams: null,
        carbsUnit: null,
        hydrationMilliliters: null,
        achievement: null,
        status: 'planifiee',
        modifiedManually: false,
        description: null,
        title: null,
        modules: [],
        changeLog: [],
        activity: null,
      });
    });

    it('persiste la séance sous l’identifiant renvoyé', async () => {
      const result = await useCase.execute(NATATION);

      expect(repository.sessions.has(result.id)).toBe(true);
    });

    it('renvoie les cinq modules dans l’ordre fourni, numérotés de 1 à 5', async () => {
      const result = await useCase.execute({
        ...NATATION,
        modules: CINQ_MODULES,
      });

      expect(result.modules.map((m) => [m.position, m.type])).toEqual([
        [1, 'echauffement'],
        [2, 'educatifs'],
        [3, 'series'],
        [4, 'series'],
        [5, 'retour_au_calme'],
      ]);
    });

    it('persiste les modules dans l’ordre fourni avec leurs zones cibles et leur effort perçu', async () => {
      const result = await useCase.execute({
        ...NATATION,
        modules: CINQ_MODULES,
      });

      const persisted = repository.sessions.get(result.id);

      expect(persisted?.modules.map((m) => m.position)).toEqual([
        1, 2, 3, 4, 5,
      ]);
      expect(persisted?.modules[2].targetZones?.toPrimitives()).toEqual({
        heartRate: { min: 140, max: 160 },
      });
      expect(persisted?.modules[2].perceivedEffort?.value()).toBe(7);
      expect(result.modules[2]).toMatchObject({
        targetZones: { heartRate: { min: 140, max: 160 } },
        perceivedEffort: 7,
      });
    });

    it('renvoie les textes facultatifs absents ou composés d’espaces comme null', async () => {
      const result = await useCase.execute({
        ...NATATION,
        description: '   ',
      });

      expect(result).toMatchObject({
        description: null,
      });
    });

    it('renvoie et persiste les glucides, leur unité et l’hydratation fournis', async () => {
      const result = await useCase.execute({
        ...NATATION,
        carbsGrams: 60,
        carbsUnit: 'par_heure',
        hydrationMilliliters: 500,
      });

      expect(result).toMatchObject({
        carbsGrams: 60,
        carbsUnit: 'par_heure',
        hydrationMilliliters: 500,
      });
      const persisted = repository.sessions.get(result.id);
      expect(persisted?.carbsGrams).toBe(60);
      expect(persisted?.carbsUnit).toBe('par_heure');
      expect(persisted?.hydrationMilliliters).toBe(500);
    });

    it('crée une séance avec hydratation seule', async () => {
      const result = await useCase.execute({
        ...NATATION,
        hydrationMilliliters: 750,
      });

      expect(result).toMatchObject({
        carbsGrams: null,
        carbsUnit: null,
        hydrationMilliliters: 750,
      });
    });

    it('renvoie la nutrition à null quand elle est fournie à null', async () => {
      const result = await useCase.execute({
        ...NATATION,
        carbsGrams: null,
        carbsUnit: null,
        hydrationMilliliters: null,
      });

      expect(result).toMatchObject({
        carbsGrams: null,
        carbsUnit: null,
        hydrationMilliliters: null,
      });
    });

    it('attribue un identifiant distinct à chaque séance créée', async () => {
      const first = await useCase.execute(NATATION);
      const second = await useCase.execute(NATATION);

      expect(first.id).not.toBe(second.id);
      expect(repository.sessions.size).toBe(2);
    });
  });

  describe('refus sans persistance', () => {
    it('refuse une discipline qui n’est pas une famille (course, vélo, natation) avec SESSION_DISCIPLINE_UNKNOWN et ne persiste rien', async () => {
      const error = await captureError(() =>
        useCase.execute({ ...NATATION, disciplineTypeKey: 'curling' }),
      );

      expect(error).toBeInstanceOf(UnknownSessionDisciplineError);
      expect(error).toMatchObject({ code: 'SESSION_DISCIPLINE_UNKNOWN' });
      expect(repository.sessions.size).toBe(0);
    });

    it('refuse une durée invalide avec SESSION_INVALID et ne persiste rien', async () => {
      await expect(
        useCase.execute({ ...NATATION, durationMinutes: 0 }),
      ).rejects.toBeInstanceOf(InvalidSessionError);

      expect(repository.sessions.size).toBe(0);
    });

    it('refuse un module invalide avec SESSION_MODULE_INVALID et ne persiste rien', async () => {
      const error = await captureError(() =>
        useCase.execute({
          ...NATATION,
          modules: [
            ...CINQ_MODULES.slice(0, 4),
            {
              type: 'retour_au_calme',
              durationMinutes: 0,
              instruction: 'Calme',
            },
          ],
        }),
      );

      expect(error).toBeInstanceOf(InvalidSessionModuleError);
      expect(error).toMatchObject({ code: 'SESSION_MODULE_INVALID' });
      expect(repository.sessions.size).toBe(0);
    });

    it('refuse des glucides sans unité avec SESSION_INVALID et ne persiste rien', async () => {
      await expect(
        useCase.execute({ ...NATATION, carbsGrams: 60 }),
      ).rejects.toMatchObject({ code: 'SESSION_INVALID' });

      expect(repository.sessions.size).toBe(0);
    });

    it('refuse une unité sans glucides avec SESSION_INVALID et ne persiste rien', async () => {
      await expect(
        useCase.execute({ ...NATATION, carbsUnit: 'par_heure' }),
      ).rejects.toMatchObject({ code: 'SESSION_INVALID' });

      expect(repository.sessions.size).toBe(0);
    });

    it('refuse une hydratation nulle avec SESSION_INVALID et ne persiste rien', async () => {
      await expect(
        useCase.execute({ ...NATATION, hydrationMilliliters: 0 }),
      ).rejects.toMatchObject({ code: 'SESSION_INVALID' });

      expect(repository.sessions.size).toBe(0);
    });

    it('refuse plus de trente modules avec SESSION_INVALID et ne persiste rien', async () => {
      const modules = Array.from({ length: 31 }, () => CINQ_MODULES[0]);

      await expect(
        useCase.execute({ ...NATATION, modules }),
      ).rejects.toMatchObject({ code: 'SESSION_INVALID' });

      expect(repository.sessions.size).toBe(0);
    });
  });
});
