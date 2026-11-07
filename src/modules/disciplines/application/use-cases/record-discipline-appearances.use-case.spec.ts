import { Test } from '@nestjs/testing';
import { Discipline } from '../../domain/entities/discipline.entity.js';
import {
  DISCIPLINE_REPOSITORY,
  type IDisciplineRepository,
} from '../../domain/ports/outbound/discipline.repository.port.js';
import { DISCIPLINES_CLOCK } from '../../domain/ports/outbound/disciplines-clock.port.js';
import { DisciplineLabel } from '../../domain/value-objects/discipline-label.vo.js';
import { DisciplineTypeKey } from '../../domain/value-objects/discipline-type-key.vo.js';
import { RecordDisciplineAppearancesUseCase } from './record-discipline-appearances.use-case.js';

const SYNC_AT = new Date('2026-11-07T10:00:00.000Z');
const PREVIOUS_SYNC_AT = new Date('2026-10-01T08:00:00.000Z');
const FIRST_SEEN_AT = new Date('2026-05-01T08:00:00.000Z');

class FakeDisciplineRepository implements IDisciplineRepository {
  readonly store = new Map<string, Discipline>();
  appearanceCalls: Discipline[][] = [];

  findAll(): Promise<Discipline[]> {
    return Promise.resolve([...this.store.values()]);
  }

  findByTypeKey(typeKey: DisciplineTypeKey): Promise<Discipline | null> {
    return Promise.resolve(this.store.get(typeKey.toString()) ?? null);
  }

  findByTypeKeys(typeKeys: DisciplineTypeKey[]): Promise<Discipline[]> {
    return Promise.resolve(
      typeKeys
        .map((key) => this.store.get(key.toString()))
        .filter((d): d is Discipline => d !== undefined),
    );
  }

  saveAppearances(disciplines: Discipline[]): Promise<void> {
    this.appearanceCalls.push(disciplines);
    for (const discipline of disciplines) {
      this.store.set(discipline.typeKey.toString(), discipline);
    }
    return Promise.resolve();
  }

  saveLabel(discipline: Discipline): Promise<void> {
    this.store.set(discipline.typeKey.toString(), discipline);
    return Promise.resolve();
  }
}

function summary(discipline: Discipline) {
  return {
    typeKey: discipline.typeKey.toString(),
    label: discipline.label.toString(),
    firstSeenAt: discipline.firstSeenAt,
    lastSeenAt: discipline.lastSeenAt,
  };
}

describe('RecordDisciplineAppearancesUseCase', () => {
  let useCase: RecordDisciplineAppearancesUseCase;
  let repository: FakeDisciplineRepository;

  beforeEach(async () => {
    repository = new FakeDisciplineRepository();
    const moduleRef = await Test.createTestingModule({
      providers: [
        RecordDisciplineAppearancesUseCase,
        { provide: DISCIPLINE_REPOSITORY, useValue: repository },
        { provide: DISCIPLINES_CLOCK, useValue: () => SYNC_AT },
      ],
    }).compile();
    useCase = moduleRef.get(RecordDisciplineAppearancesUseCase);
  });

  describe('clé inconnue', () => {
    it('enregistre la discipline avec la date de synchronisation comme première et dernière apparition', async () => {
      await useCase.execute(['running']);

      expect(repository.appearanceCalls.flat().map(summary)).toEqual([
        {
          typeKey: 'running',
          label: 'running',
          firstSeenAt: SYNC_AT,
          lastSeenAt: SYNC_AT,
        },
      ]);
    });

    it('enregistre chaque clé inconnue de la liste', async () => {
      await useCase.execute(['running', 'cycling']);

      expect(
        repository.appearanceCalls
          .flat()
          .map((d) => d.typeKey.toString())
          .sort(),
      ).toEqual(['cycling', 'running']);
    });
  });

  describe('clé connue', () => {
    beforeEach(() => {
      repository.store.set(
        'running',
        Discipline.reconstitute({
          typeKey: DisciplineTypeKey.create('running'),
          label: DisciplineLabel.create('Course à pied'),
          firstSeenAt: FIRST_SEEN_AT,
          lastSeenAt: PREVIOUS_SYNC_AT,
        }),
      );
    });

    it('avance seulement la dernière apparition', async () => {
      await useCase.execute(['running']);

      expect(repository.appearanceCalls.flat().map(summary)).toEqual([
        {
          typeKey: 'running',
          label: 'Course à pied',
          firstSeenAt: FIRST_SEEN_AT,
          lastSeenAt: SYNC_AT,
        },
      ]);
    });

    it('ne crée pas de seconde discipline pour la même clé', async () => {
      await useCase.execute(['running']);

      expect(repository.appearanceCalls.flat()).toHaveLength(1);
    });
  });

  describe('liste de clés', () => {
    it('dédoublonne les clés répétées', async () => {
      await useCase.execute(['running', 'running', 'running']);

      expect(repository.appearanceCalls.flat()).toHaveLength(1);
    });

    it('considère deux clés identiques après retrait des espaces comme une seule', async () => {
      await useCase.execute([' running ', 'running']);

      expect(repository.appearanceCalls.flat()).toHaveLength(1);
    });

    it('ignore les clés vides ou composées d’espaces sans lever d’erreur', async () => {
      await expect(
        useCase.execute(['', '   ', 'running']),
      ).resolves.toBeUndefined();

      expect(
        repository.appearanceCalls.flat().map((d) => d.typeKey.toString()),
      ).toEqual(['running']);
    });

    it('n’écrit rien quand la liste est vide', async () => {
      await useCase.execute([]);

      expect(repository.appearanceCalls).toEqual([]);
    });

    it('n’écrit rien quand toutes les clés sont vides', async () => {
      await useCase.execute(['', '  ']);

      expect(repository.appearanceCalls.flat()).toEqual([]);
    });
  });
});
