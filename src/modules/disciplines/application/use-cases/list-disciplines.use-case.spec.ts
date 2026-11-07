import { Test } from '@nestjs/testing';
import { Discipline } from '../../domain/entities/discipline.entity.js';
import {
  DISCIPLINE_REPOSITORY,
  type IDisciplineRepository,
} from '../../domain/ports/outbound/discipline.repository.port.js';
import { DisciplineLabel } from '../../domain/value-objects/discipline-label.vo.js';
import { DisciplineTypeKey } from '../../domain/value-objects/discipline-type-key.vo.js';
import { ListDisciplinesUseCase } from './list-disciplines.use-case.js';

const FIRST_SEEN_AT = new Date('2026-05-01T08:00:00.000Z');
const LAST_SEEN_AT = new Date('2026-11-07T10:00:00.000Z');

function discipline(typeKey: string, label: string): Discipline {
  return Discipline.reconstitute({
    typeKey: DisciplineTypeKey.create(typeKey),
    label: DisciplineLabel.create(label),
    firstSeenAt: FIRST_SEEN_AT,
    lastSeenAt: LAST_SEEN_AT,
  });
}

class FakeDisciplineRepository implements IDisciplineRepository {
  disciplines: Discipline[] = [];

  findAll(): Promise<Discipline[]> {
    return Promise.resolve(this.disciplines);
  }

  findByTypeKey(): Promise<Discipline | null> {
    return Promise.resolve(null);
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

describe('ListDisciplinesUseCase', () => {
  let useCase: ListDisciplinesUseCase;
  let repository: FakeDisciplineRepository;

  beforeEach(async () => {
    repository = new FakeDisciplineRepository();
    const moduleRef = await Test.createTestingModule({
      providers: [
        ListDisciplinesUseCase,
        { provide: DISCIPLINE_REPOSITORY, useValue: repository },
      ],
    }).compile();
    useCase = moduleRef.get(ListDisciplinesUseCase);
  });

  it('renvoie chaque discipline avec sa clé, son libellé et ses dates d’apparition', async () => {
    repository.disciplines = [discipline('running', 'Course à pied')];

    await expect(useCase.execute()).resolves.toEqual([
      {
        typeKey: 'running',
        label: 'Course à pied',
        firstSeenAt: FIRST_SEEN_AT,
        lastSeenAt: LAST_SEEN_AT,
      },
    ]);
  });

  it('conserve l’ordre renvoyé par le référentiel', async () => {
    repository.disciplines = [
      discipline('cycling', 'Cyclisme'),
      discipline('running', 'Course à pied'),
    ];

    const result = await useCase.execute();

    expect(result.map((d) => d.typeKey)).toEqual(['cycling', 'running']);
  });

  it('renvoie une liste vide quand aucune discipline n’est connue', async () => {
    await expect(useCase.execute()).resolves.toEqual([]);
  });
});
