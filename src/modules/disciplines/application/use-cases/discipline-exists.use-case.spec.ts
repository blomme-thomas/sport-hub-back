import { Test } from '@nestjs/testing';
import { Discipline } from '../../domain/entities/discipline.entity.js';
import {
  DISCIPLINE_REPOSITORY,
  type IDisciplineRepository,
} from '../../domain/ports/outbound/discipline.repository.port.js';
import { DisciplineLabel } from '../../domain/value-objects/discipline-label.vo.js';
import { DisciplineTypeKey } from '../../domain/value-objects/discipline-type-key.vo.js';
import { DisciplineExistsUseCase } from './discipline-exists.use-case.js';

const FIRST_SEEN_AT = new Date('2026-05-01T08:00:00.000Z');
const LAST_SEEN_AT = new Date('2026-11-07T10:00:00.000Z');
const KEY_MAX_LENGTH = 100;

class FakeDisciplineRepository implements IDisciplineRepository {
  readonly store = new Map<string, Discipline>();

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

  saveLabel(): Promise<void> {
    return Promise.resolve();
  }
}

describe('DisciplineExistsUseCase', () => {
  let useCase: DisciplineExistsUseCase;
  let repository: FakeDisciplineRepository;

  beforeEach(async () => {
    repository = new FakeDisciplineRepository();
    repository.store.set(
      'swimming',
      Discipline.reconstitute({
        typeKey: DisciplineTypeKey.create('swimming'),
        label: DisciplineLabel.create('Natation'),
        firstSeenAt: FIRST_SEEN_AT,
        lastSeenAt: LAST_SEEN_AT,
      }),
    );
    const moduleRef = await Test.createTestingModule({
      providers: [
        DisciplineExistsUseCase,
        { provide: DISCIPLINE_REPOSITORY, useValue: repository },
      ],
    }).compile();
    useCase = moduleRef.get(DisciplineExistsUseCase);
  });

  it('renvoie vrai pour une clé présente dans le référentiel', async () => {
    await expect(useCase.execute('swimming')).resolves.toBe(true);
  });

  it('renvoie faux pour une clé absente du référentiel', async () => {
    await expect(useCase.execute('curling')).resolves.toBe(false);
  });

  it.each([
    ['chaîne vide', ''],
    ['espaces seuls', '   '],
    [
      `clé de plus de ${KEY_MAX_LENGTH} caractères`,
      'a'.repeat(KEY_MAX_LENGTH + 1),
    ],
  ])('renvoie faux pour une clé %s', async (_label, typeKey) => {
    await expect(useCase.execute(typeKey)).resolves.toBe(false);
  });
});
