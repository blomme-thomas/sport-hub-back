import { Test } from '@nestjs/testing';
import type { Slot } from '../../domain/entities/slot.entity.js';
import { InvalidSlotError } from '../../domain/errors/invalid-slot.error.js';
import { SlotEndNotAfterStartError } from '../../domain/errors/slot-end-not-after-start.error.js';
import {
  type ISlotRepository,
  SLOT_REPOSITORY,
} from '../../domain/ports/outbound/slot.repository.port.js';
import type { SlotPeriod } from '../../domain/value-objects/slot-period.vo.js';
import type { SlotId } from '../../domain/value-objects/slot-id.vo.js';
import type { CreateSlotCommand } from '../dtos/slot.dto.js';
import { CreateSlotUseCase } from './create-slot.use-case.js';

const LIBRE_PONCTUEL: CreateSlotCommand = {
  type: 'libre',
  date: '2026-05-04',
  startTime: '09:00',
  endTime: '10:00',
};

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

describe('CreateSlotUseCase', () => {
  let useCase: CreateSlotUseCase;
  let repository: FakeSlotRepository;

  beforeEach(async () => {
    repository = new FakeSlotRepository();
    const moduleRef = await Test.createTestingModule({
      providers: [
        CreateSlotUseCase,
        { provide: SLOT_REPOSITORY, useValue: repository },
      ],
    }).compile();
    useCase = moduleRef.get(CreateSlotUseCase);
  });

  describe('création réussie', () => {
    it('renvoie un créneau libre ponctuel avec la récurrence aucune et le fuseau Europe/Paris par défaut', async () => {
      const result = await useCase.execute(LIBRE_PONCTUEL);

      expect(result).toEqual({
        id: expect.any(String),
        type: 'libre',
        date: '2026-05-04',
        startTime: '09:00',
        endTime: '10:00',
        recurrence: 'aucune',
        timeZone: 'Europe/Paris',
      });
    });

    it('persiste le créneau créé sous l’identifiant renvoyé', async () => {
      const result = await useCase.execute(LIBRE_PONCTUEL);

      expect(repository.slots.has(result.id)).toBe(true);
    });

    it('conserve la récurrence hebdomadaire et le fuseau fournis', async () => {
      const result = await useCase.execute({
        type: 'occupe',
        date: '2026-05-04',
        startTime: '18:00',
        endTime: '19:30',
        recurrence: 'hebdomadaire',
        timeZone: 'America/New_York',
      });

      expect(result).toMatchObject({
        type: 'occupe',
        recurrence: 'hebdomadaire',
        timeZone: 'America/New_York',
      });
    });

    it('attribue un identifiant distinct à chaque créneau créé', async () => {
      const first = await useCase.execute(LIBRE_PONCTUEL);
      const second = await useCase.execute(LIBRE_PONCTUEL);

      expect(first.id).not.toBe(second.id);
      expect(repository.slots.size).toBe(2);
    });

    it('accepte deux créneaux qui se chevauchent', async () => {
      await useCase.execute(LIBRE_PONCTUEL);
      const overlapping = await useCase.execute({
        ...LIBRE_PONCTUEL,
        type: 'occupe',
        startTime: '09:30',
        endTime: '10:30',
      });

      expect(repository.slots.has(overlapping.id)).toBe(true);
      expect(repository.slots.size).toBe(2);
    });
  });

  describe('refus sans persistance', () => {
    it('refuse une fin égale au début avec SLOT_END_NOT_AFTER_START', async () => {
      await expect(
        useCase.execute({ ...LIBRE_PONCTUEL, endTime: '09:00' }),
      ).rejects.toBeInstanceOf(SlotEndNotAfterStartError);
      await expect(
        useCase.execute({ ...LIBRE_PONCTUEL, endTime: '09:00' }),
      ).rejects.toMatchObject({ code: 'SLOT_END_NOT_AFTER_START' });
    });

    it('refuse une fin antérieure au début et ne persiste rien', async () => {
      await expect(
        useCase.execute({ ...LIBRE_PONCTUEL, endTime: '08:00' }),
      ).rejects.toBeInstanceOf(SlotEndNotAfterStartError);

      expect(repository.slots.size).toBe(0);
    });

    it('refuse un fuseau inconnu avec SLOT_INVALID et ne persiste rien', async () => {
      await expect(
        useCase.execute({ ...LIBRE_PONCTUEL, timeZone: 'Mars/Olympus' }),
      ).rejects.toBeInstanceOf(InvalidSlotError);

      expect(repository.slots.size).toBe(0);
    });

    it.each([
      ['un type hors valeurs', { type: 'autre' }],
      ['une récurrence hors valeurs', { recurrence: 'mensuelle' }],
      ['une heure mal formée', { startTime: '9h' }],
      ['une date mal formée', { date: '04/05/2026' }],
    ])(
      'refuse %s avec SLOT_INVALID et ne persiste rien',
      async (_label, overrides) => {
        await expect(
          useCase.execute({
            ...LIBRE_PONCTUEL,
            ...overrides,
          } as CreateSlotCommand),
        ).rejects.toMatchObject({ code: 'SLOT_INVALID' });

        expect(repository.slots.size).toBe(0);
      },
    );
  });
});
