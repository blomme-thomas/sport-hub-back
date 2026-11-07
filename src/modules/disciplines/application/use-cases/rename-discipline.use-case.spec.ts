import { Test } from '@nestjs/testing';
import { Discipline } from '../../domain/entities/discipline.entity.js';
import { DisciplineNotFoundError } from '../../domain/errors/discipline-not-found.error.js';
import { InvalidDisciplineLabelError } from '../../domain/errors/invalid-discipline-label.error.js';
import {
  DISCIPLINE_REPOSITORY,
  type IDisciplineRepository,
} from '../../domain/ports/outbound/discipline.repository.port.js';
import { DisciplineLabel } from '../../domain/value-objects/discipline-label.vo.js';
import { DisciplineTypeKey } from '../../domain/value-objects/discipline-type-key.vo.js';
import { RenameDisciplineUseCase } from './rename-discipline.use-case.js';

const LABEL_MAX_LENGTH = 60;
const FIRST_SEEN_AT = new Date('2026-05-01T08:00:00.000Z');
const LAST_SEEN_AT = new Date('2026-11-07T10:00:00.000Z');

class FakeDisciplineRepository implements IDisciplineRepository {
  readonly store = new Map<string, Discipline>();
  labelSaves = 0;

  findAll(): Promise<Discipline[]> {
    return Promise.resolve([...this.store.values()]);
  }

  findByTypeKey(typeKey: DisciplineTypeKey): Promise<Discipline | null> {
    return Promise.resolve(this.store.get(typeKey.toString()) ?? null);
  }

  findByTypeKeys(): Promise<Discipline[]> {
    return Promise.resolve([]);
  }

  saveAppearances(): Promise<void> {
    return Promise.resolve();
  }

  saveLabel(discipline: Discipline): Promise<void> {
    this.labelSaves += 1;
    this.store.set(discipline.typeKey.toString(), discipline);
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

describe('RenameDisciplineUseCase', () => {
  let useCase: RenameDisciplineUseCase;
  let repository: FakeDisciplineRepository;

  beforeEach(async () => {
    repository = new FakeDisciplineRepository();
    repository.store.set(
      'running',
      Discipline.reconstitute({
        typeKey: DisciplineTypeKey.create('running'),
        label: DisciplineLabel.create('running'),
        firstSeenAt: FIRST_SEEN_AT,
        lastSeenAt: LAST_SEEN_AT,
      }),
    );
    const moduleRef = await Test.createTestingModule({
      providers: [
        RenameDisciplineUseCase,
        { provide: DISCIPLINE_REPOSITORY, useValue: repository },
      ],
    }).compile();
    useCase = moduleRef.get(RenameDisciplineUseCase);
  });

  describe('renommage réussi', () => {
    it('renvoie la discipline avec le nouveau libellé', async () => {
      await expect(
        useCase.execute({ typeKey: 'running', label: 'Course à pied' }),
      ).resolves.toEqual({
        typeKey: 'running',
        label: 'Course à pied',
        firstSeenAt: FIRST_SEEN_AT,
        lastSeenAt: LAST_SEEN_AT,
      });
    });

    it('persiste le nouveau libellé sous la même clé de type', async () => {
      await useCase.execute({ typeKey: 'running', label: 'Course à pied' });

      expect(repository.store.size).toBe(1);
      expect(repository.store.get('running')?.label.toString()).toBe(
        'Course à pied',
      );
    });

    it('retire les espaces en bordure du libellé', async () => {
      const result = await useCase.execute({
        typeKey: 'running',
        label: '  Course à pied  ',
      });

      expect(result.label).toBe('Course à pied');
    });

    it('accepte un libellé de la longueur maximale', async () => {
      const label = 'a'.repeat(LABEL_MAX_LENGTH);

      await expect(
        useCase.execute({ typeKey: 'running', label }),
      ).resolves.toMatchObject({ label });
    });
  });

  describe('refus sans modification', () => {
    it('refuse une clé inconnue avec DISCIPLINE_NOT_FOUND sans rien persister', async () => {
      const error = await captureError(() =>
        useCase.execute({ typeKey: 'swimming', label: 'Natation' }),
      );

      expect(error).toBeInstanceOf(DisciplineNotFoundError);
      expect(error).toMatchObject({ code: 'DISCIPLINE_NOT_FOUND' });
      expect(repository.labelSaves).toBe(0);
      expect(repository.store.has('swimming')).toBe(false);
    });

    it.each([
      ['vide', ''],
      ['composé d’espaces', '   '],
      [
        `de plus de ${LABEL_MAX_LENGTH} caractères`,
        'a'.repeat(LABEL_MAX_LENGTH + 1),
      ],
    ])(
      'refuse un libellé %s avec DISCIPLINE_LABEL_INVALID sans rien persister',
      async (_label, label) => {
        const error = await captureError(() =>
          useCase.execute({ typeKey: 'running', label }),
        );

        expect(error).toBeInstanceOf(InvalidDisciplineLabelError);
        expect(error).toMatchObject({ code: 'DISCIPLINE_LABEL_INVALID' });
        expect(repository.labelSaves).toBe(0);
        expect(repository.store.get('running')?.label.toString()).toBe(
          'running',
        );
      },
    );
  });
});
