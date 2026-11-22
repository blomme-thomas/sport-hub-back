import { Test } from '@nestjs/testing';
import { Slot } from '../../domain/entities/slot.entity.js';
import { InvalidSlotPeriodError } from '../../domain/errors/invalid-slot-period.error.js';
import { SlotPeriodTooLargeError } from '../../domain/errors/slot-period-too-large.error.js';
import {
  type ISlotRepository,
  SLOT_REPOSITORY,
} from '../../domain/ports/outbound/slot.repository.port.js';
import { LocalTime } from '../../domain/value-objects/local-time.vo.js';
import type { SlotId } from '../../domain/value-objects/slot-id.vo.js';
import type { SlotPeriod } from '../../domain/value-objects/slot-period.vo.js';
import { SlotTimeZone } from '../../domain/value-objects/slot-time-zone.vo.js';
import { ListSlotOccurrencesUseCase } from './list-slot-occurrences.use-case.js';

type SlotProps = Parameters<typeof Slot.create>[0];

class FakeSlotRepository implements ISlotRepository {
  readonly slots = new Map<string, Slot>();

  findById(id: SlotId): Promise<Slot | null> {
    return Promise.resolve(this.slots.get(id.toString()) ?? null);
  }

  findIntersecting(_period: SlotPeriod): Promise<Slot[]> {
    return Promise.resolve([...this.slots.values()]);
  }

  save(slot: Slot): Promise<void> {
    this.slots.set(slot.id.toString(), slot);
    return Promise.resolve();
  }

  delete(id: SlotId): Promise<void> {
    this.slots.delete(id.toString());
    return Promise.resolve();
  }
}

function props(overrides: Partial<SlotProps> = {}): SlotProps {
  return {
    type: 'libre',
    date: new Date('2026-05-04T00:00:00.000Z'),
    startTime: LocalTime.parse('09:00'),
    endTime: LocalTime.parse('10:00'),
    recurrence: 'aucune',
    timeZone: SlotTimeZone.create('Europe/Paris'),
    ...overrides,
  };
}

describe('ListSlotOccurrencesUseCase', () => {
  let useCase: ListSlotOccurrencesUseCase;
  let repository: FakeSlotRepository;

  beforeEach(async () => {
    repository = new FakeSlotRepository();
    const moduleRef = await Test.createTestingModule({
      providers: [
        ListSlotOccurrencesUseCase,
        { provide: SLOT_REPOSITORY, useValue: repository },
      ],
    }).compile();
    useCase = moduleRef.get(ListSlotOccurrencesUseCase);
  });

  describe('créneau ponctuel', () => {
    it('renvoie le créneau libre dont la date est dans la période', async () => {
      const slot = Slot.create(props());
      await repository.save(slot);

      const result = await useCase.execute({
        from: '2026-05-01',
        to: '2026-05-31',
      });

      expect(result).toEqual({
        from: '2026-05-01',
        to: '2026-05-31',
        items: [
          {
            slotId: slot.id.toString(),
            type: 'libre',
            date: '2026-05-04',
            startTime: '09:00',
            endTime: '10:00',
            recurrence: 'aucune',
            timeZone: 'Europe/Paris',
          },
        ],
      });
    });

    it('exclut un créneau ponctuel dont la date est hors de la période', async () => {
      await repository.save(
        Slot.create(props({ date: new Date('2026-06-02T00:00:00.000Z') })),
      );

      const result = await useCase.execute({
        from: '2026-05-01',
        to: '2026-05-31',
      });

      expect(result.items).toEqual([]);
    });

    it('inclut les dates égales aux bornes from et to', async () => {
      await repository.save(
        Slot.create(props({ date: new Date('2026-05-01T00:00:00.000Z') })),
      );
      await repository.save(
        Slot.create(props({ date: new Date('2026-05-31T00:00:00.000Z') })),
      );

      const result = await useCase.execute({
        from: '2026-05-01',
        to: '2026-05-31',
      });

      expect(result.items.map((item) => item.date)).toEqual([
        '2026-05-01',
        '2026-05-31',
      ]);
    });
  });

  describe('créneau hebdomadaire', () => {
    it('renvoie une occurrence par semaine sur quatre semaines', async () => {
      const slot = Slot.create(
        props({
          type: 'occupe',
          recurrence: 'hebdomadaire',
          date: new Date('2026-05-04T00:00:00.000Z'),
        }),
      );
      await repository.save(slot);

      const result = await useCase.execute({
        from: '2026-05-01',
        to: '2026-05-28',
      });

      expect(result.items.map((item) => item.date)).toEqual([
        '2026-05-04',
        '2026-05-11',
        '2026-05-18',
        '2026-05-25',
      ]);
      expect(
        result.items.every(
          (item) =>
            item.slotId === slot.id.toString() &&
            item.type === 'occupe' &&
            item.recurrence === 'hebdomadaire',
        ),
      ).toBe(true);
    });

    it('renvoie une liste vide pour une période antérieure à l’ancre', async () => {
      await repository.save(
        Slot.create(
          props({
            recurrence: 'hebdomadaire',
            date: new Date('2026-05-04T00:00:00.000Z'),
          }),
        ),
      );

      const result = await useCase.execute({
        from: '2026-04-01',
        to: '2026-04-30',
      });

      expect(result.items).toEqual([]);
    });
  });

  describe('chevauchements et tri', () => {
    it('renvoie tous les créneaux qui se chevauchent', async () => {
      await repository.save(
        Slot.create(
          props({
            startTime: LocalTime.parse('09:00'),
            endTime: LocalTime.parse('11:00'),
          }),
        ),
      );
      await repository.save(
        Slot.create(
          props({
            type: 'occupe',
            startTime: LocalTime.parse('10:00'),
            endTime: LocalTime.parse('12:00'),
          }),
        ),
      );

      const result = await useCase.execute({
        from: '2026-05-01',
        to: '2026-05-31',
      });

      expect(result.items).toHaveLength(2);
      expect(result.items.map((item) => item.type).sort()).toEqual([
        'libre',
        'occupe',
      ]);
    });

    it('trie les occurrences par date puis par heure de début', async () => {
      const late = Slot.create(
        props({
          date: new Date('2026-05-05T00:00:00.000Z'),
          startTime: LocalTime.parse('14:00'),
          endTime: LocalTime.parse('15:00'),
        }),
      );
      const afternoon = Slot.create(
        props({
          date: new Date('2026-05-04T00:00:00.000Z'),
          startTime: LocalTime.parse('15:00'),
          endTime: LocalTime.parse('16:00'),
        }),
      );
      const morning = Slot.create(
        props({
          date: new Date('2026-05-04T00:00:00.000Z'),
          startTime: LocalTime.parse('09:00'),
          endTime: LocalTime.parse('10:00'),
        }),
      );
      await repository.save(late);
      await repository.save(afternoon);
      await repository.save(morning);

      const result = await useCase.execute({
        from: '2026-05-01',
        to: '2026-05-31',
      });

      expect(result.items.map((item) => item.slotId)).toEqual([
        morning.id.toString(),
        afternoon.id.toString(),
        late.id.toString(),
      ]);
    });

    it('trie les occurrences de même date et même heure par identifiant', async () => {
      const first = Slot.create(props());
      const second = Slot.create(props());
      await repository.save(first);
      await repository.save(second);

      const result = await useCase.execute({
        from: '2026-05-01',
        to: '2026-05-31',
      });

      expect(result.items.map((item) => item.slotId)).toEqual(
        [first.id.toString(), second.id.toString()].sort((left, right) =>
          left < right ? -1 : 1,
        ),
      );
    });
  });

  describe('liste vide et périodes invalides', () => {
    it('renvoie une liste vide quand aucun créneau n’existe', async () => {
      const result = await useCase.execute({
        from: '2026-05-01',
        to: '2026-05-31',
      });

      expect(result).toEqual({
        from: '2026-05-01',
        to: '2026-05-31',
        items: [],
      });
    });

    it('accepte une période de 366 jours', async () => {
      await expect(
        useCase.execute({ from: '2026-01-01', to: '2027-01-01' }),
      ).resolves.toMatchObject({ items: [] });
    });

    it('refuse une période dont la fin précède le début avec SLOT_PERIOD_INVALID', async () => {
      await expect(
        useCase.execute({ from: '2026-05-31', to: '2026-05-01' }),
      ).rejects.toBeInstanceOf(InvalidSlotPeriodError);
      await expect(
        useCase.execute({ from: '2026-05-31', to: '2026-05-01' }),
      ).rejects.toMatchObject({ code: 'SLOT_PERIOD_INVALID' });
    });

    it('refuse une période de plus de 366 jours avec SLOT_PERIOD_TOO_LARGE', async () => {
      await expect(
        useCase.execute({ from: '2026-01-01', to: '2027-01-02' }),
      ).rejects.toBeInstanceOf(SlotPeriodTooLargeError);
      await expect(
        useCase.execute({ from: '2026-01-01', to: '2027-01-02' }),
      ).rejects.toMatchObject({ code: 'SLOT_PERIOD_TOO_LARGE' });
    });
  });
});
