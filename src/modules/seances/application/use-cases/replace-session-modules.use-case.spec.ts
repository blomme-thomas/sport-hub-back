import { Test } from '@nestjs/testing';
import { Session } from '../../domain/entities/session.entity.js';
import { InvalidSessionError } from '../../domain/errors/invalid-session.error.js';
import { InvalidSessionModuleError } from '../../domain/errors/invalid-session-module.error.js';
import { SessionAlreadyCompletedError } from '../../domain/errors/session-already-completed.error.js';
import { SessionNotFoundError } from '../../domain/errors/session-not-found.error.js';
import { SEANCES_CLOCK } from '../../domain/ports/outbound/seances-clock.port.js';
import {
  SESSION_REPOSITORY,
  type ISessionRepository,
} from '../../domain/ports/outbound/session.repository.port.js';
import { SessionId } from '../../domain/value-objects/session-id.vo.js';
import { SessionModule } from '../../domain/value-objects/session-module.vo.js';
import type { SessionModuleInput } from '../dtos/session.dto.js';
import { ReplaceSessionModulesUseCase } from './replace-session-modules.use-case.js';

const NOW = new Date('2026-11-08T10:00:00.000Z');
const UNKNOWN_ID = '3f2504e0-4f89-41d3-9a0c-0305e82c3301';

const ECHAUFFEMENT: SessionModuleInput = {
  type: 'echauffement',
  durationMinutes: 10,
  instruction: 'Nage souple',
};
const EDUCATIFS: SessionModuleInput = {
  type: 'educatifs',
  durationMinutes: 10,
  instruction: 'Battements jambes',
  perceivedEffort: 3,
};
const SERIES: SessionModuleInput = {
  type: 'series',
  durationMinutes: 20,
  instruction: '4 x 100 m',
  targetZones: { heartRate: { min: 140, max: 160 } },
  perceivedEffort: 7,
};
const RETOUR_AU_CALME: SessionModuleInput = {
  type: 'retour_au_calme',
  durationMinutes: 10,
  instruction: 'Nage lente',
};

class FakeSessionRepository implements ISessionRepository {
  readonly sessions = new Map<string, Session>();
  saves = 0;

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
    this.saves += 1;
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

describe('ReplaceSessionModulesUseCase', () => {
  let useCase: ReplaceSessionModulesUseCase;
  let repository: FakeSessionRepository;
  let id: string;

  async function seed(status = 'planifiee') {
    const session = Session.reconstitute({
      id: SessionId.generate(),
      date: new Date('2026-05-04T00:00:00.000Z'),
      disciplineTypeKey: 'swimming',
      durationMinutes: 60,
      status,
      modifiedManually: false,
      description: null,
      equipment: null,
      attentionPoints: null,
      modules: [
        SessionModule.create({ position: 1, ...ECHAUFFEMENT }),
        SessionModule.create({ position: 2, ...SERIES }),
        SessionModule.create({ position: 3, ...RETOUR_AU_CALME }),
      ],
      changeLog: [],
    });
    id = session.id.toString();
    await repository.save(session);
  }

  beforeEach(async () => {
    repository = new FakeSessionRepository();
    const moduleRef = await Test.createTestingModule({
      providers: [
        ReplaceSessionModulesUseCase,
        { provide: SESSION_REPOSITORY, useValue: repository },
        { provide: SEANCES_CLOCK, useValue: () => NOW },
      ],
    }).compile();
    useCase = moduleRef.get(ReplaceSessionModulesUseCase);
    await seed();
  });

  describe('remplacement réussi', () => {
    it('réordonne les modules selon la liste fournie et renumérote les positions de 1 à n', async () => {
      const result = await useCase.execute({
        id,
        modules: [RETOUR_AU_CALME, SERIES, ECHAUFFEMENT],
      });

      expect(result.modules.map((m) => [m.position, m.type])).toEqual([
        [1, 'retour_au_calme'],
        [2, 'series'],
        [3, 'echauffement'],
      ]);
    });

    it('persiste la nouvelle liste ordonnée sous le même identifiant', async () => {
      await useCase.execute({
        id,
        modules: [RETOUR_AU_CALME, SERIES, ECHAUFFEMENT],
      });

      const persisted = repository.sessions.get(id);

      expect(repository.sessions.size).toBe(1);
      expect(persisted?.modules.map((m) => [m.position, m.type])).toEqual([
        [1, 'retour_au_calme'],
        [2, 'series'],
        [3, 'echauffement'],
      ]);
    });

    it('conserve les zones cibles et l’effort perçu de chaque module', async () => {
      const result = await useCase.execute({
        id,
        modules: [EDUCATIFS, SERIES],
      });

      expect(result.modules).toEqual([
        {
          position: 1,
          type: 'educatifs',
          durationMinutes: 10,
          instruction: 'Battements jambes',
          targetZones: null,
          perceivedEffort: 3,
        },
        {
          position: 2,
          type: 'series',
          durationMinutes: 20,
          instruction: '4 x 100 m',
          targetZones: { heartRate: { min: 140, max: 160 } },
          perceivedEffort: 7,
        },
      ]);
    });

    it('positionne modifiedManually à vrai et journalise le remplacement', async () => {
      const result = await useCase.execute({ id, modules: [SERIES] });

      expect(result.modifiedManually).toBe(true);
      expect(result.changeLog).toEqual([
        expect.objectContaining({ changedAt: NOW, field: 'modules' }),
      ]);
    });

    it('vide la liste quand le remplacement ne contient aucun module', async () => {
      const result = await useCase.execute({ id, modules: [] });

      expect(result.modules).toEqual([]);
      expect(repository.sessions.get(id)?.modules).toEqual([]);
    });

    it('ne modifie pas les autres champs de la séance', async () => {
      const result = await useCase.execute({ id, modules: [SERIES] });

      expect(result).toMatchObject({
        date: '2026-05-04',
        disciplineTypeKey: 'swimming',
        durationMinutes: 60,
        status: 'planifiee',
      });
    });
  });

  describe('refus sans modification', () => {
    it('ne journalise rien quand la liste fournie est identique à la liste courante', async () => {
      const result = await useCase.execute({
        id,
        modules: [ECHAUFFEMENT, SERIES, RETOUR_AU_CALME],
      });

      expect(result.modifiedManually).toBe(false);
      expect(result.changeLog).toEqual([]);
    });

    it('refuse un identifiant inconnu avec SESSION_NOT_FOUND sans rien persister', async () => {
      const error = await captureError(() =>
        useCase.execute({ id: UNKNOWN_ID, modules: [SERIES] }),
      );

      expect(error).toBeInstanceOf(SessionNotFoundError);
      expect(error).toMatchObject({ code: 'SESSION_NOT_FOUND' });
      expect(repository.sessions.has(UNKNOWN_ID)).toBe(false);
    });

    it('refuse le remplacement d’une séance réalisée avec SESSION_ALREADY_COMPLETED et ne touche pas aux modules', async () => {
      await seed('realisee');
      const completedId = id;

      const error = await captureError(() =>
        useCase.execute({ id: completedId, modules: [SERIES] }),
      );

      expect(error).toBeInstanceOf(SessionAlreadyCompletedError);
      expect(error).toMatchObject({ code: 'SESSION_ALREADY_COMPLETED' });
      expect(repository.sessions.get(completedId)?.modules).toHaveLength(3);
    });

    it('refuse un module invalide avec SESSION_MODULE_INVALID et conserve la liste courante', async () => {
      const saves = repository.saves;

      const error = await captureError(() =>
        useCase.execute({
          id,
          modules: [SERIES, { ...EDUCATIFS, durationMinutes: 0 }],
        }),
      );

      expect(error).toBeInstanceOf(InvalidSessionModuleError);
      expect(error).toMatchObject({ code: 'SESSION_MODULE_INVALID' });
      expect(repository.saves).toBe(saves);
      expect(repository.sessions.get(id)?.modules).toHaveLength(3);
    });

    it('refuse plus de trente modules avec SESSION_INVALID et ne persiste rien', async () => {
      const saves = repository.saves;
      const modules = Array.from({ length: 31 }, () => SERIES);

      await expect(useCase.execute({ id, modules })).rejects.toBeInstanceOf(
        InvalidSessionError,
      );

      expect(repository.saves).toBe(saves);
    });
  });
});
