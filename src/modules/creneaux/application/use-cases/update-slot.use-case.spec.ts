import { Test } from '@nestjs/testing';
import { Slot } from '../../domain/entities/slot.entity.js';
import { InvalidSlotError } from '../../domain/errors/invalid-slot.error.js';
import { SlotEndNotAfterStartError } from '../../domain/errors/slot-end-not-after-start.error.js';
import { SlotNotFoundError } from '../../domain/errors/slot-not-found.error.js';
import {
  type ISlotRepository,
  SLOT_REPOSITORY,
} from '../../domain/ports/outbound/slot.repository.port.js';
import type { SlotId } from '../../domain/value-objects/slot-id.vo.js';
import type { SlotPeriod } from '../../domain/value-objects/slot-period.vo.js';
import { LocalTime } from '../../domain/value-objects/local-time.vo.js';
import { SlotTimeZone } from '../../domain/value-objects/slot-time-zone.vo.js';
import { UpdateSlotUseCase } from './update-slot.use-case.js';

const UNKNOWN_ID = '3f2504e0-4f89-41d3-9a0c-0305e82c3301';

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

function seededSlot(): Slot {
  return Slot.create({
    type: 'libre',
    date: new Date('2026-05-04T00:00:00.000Z'),
    startTime: LocalTime.parse('09:00'),
    endTime: LocalTime.parse('10:00'),
    recurrence: 'aucune',
    timeZone: SlotTimeZone.create('Europe/Paris'),
  });
}

describe('UpdateSlotUseCase', () => {
  let useCase: UpdateSlotUseCase;
  let repository: FakeSlotRepository;
  let slot: Slot;
  let id: string;

  beforeEach(async () => {
    repository = new FakeSlotRepository();
    slot = seededSlot();
    id = slot.id.toString();
    await repository.save(slot);
    const moduleRef = await Test.createTestingModule({
      providers: [
        UpdateSlotUseCase,
        { provide: SLOT_REPOSITORY, useValue: repository },
      ],
    }).compile();
    useCase = moduleRef.get(UpdateSlotUseCase);
  });

  describe('modification réussie', () => {
    it('fusionne les champs modifiés avec l’état courant du créneau', async () => {
      const result = await useCase.execute({ id, endTime: '11:00' });

      expect(result).toEqual({
        id,
        type: 'libre',
        date: '2026-05-04',
        startTime: '09:00',
        endTime: '11:00',
        recurrence: 'aucune',
        timeZone: 'Europe/Paris',
      });
    });

    it('persiste la modification sous le même identifiant', async () => {
      await useCase.execute({ id, endTime: '11:00' });

      expect(repository.slots.size).toBe(1);
      expect(repository.slots.get(id)?.endTime.toString()).toBe('11:00');
    });

    it('passe un créneau ponctuel en hebdomadaire', async () => {
      const result = await useCase.execute({
        id,
        recurrence: 'hebdomadaire',
      });

      expect(result.recurrence).toBe('hebdomadaire');
    });

    it('renvoie le créneau inchangé quand la modification est vide', async () => {
      const result = await useCase.execute({ id });

      expect(result).toEqual({
        id,
        type: 'libre',
        date: '2026-05-04',
        startTime: '09:00',
        endTime: '10:00',
        recurrence: 'aucune',
        timeZone: 'Europe/Paris',
      });
    });
  });

  describe('refus sans modification', () => {
    it('refuse un début repoussé après la fin courante et ne modifie pas le créneau', async () => {
      await expect(
        useCase.execute({ id, startTime: '10:30' }),
      ).rejects.toBeInstanceOf(SlotEndNotAfterStartError);

      expect(repository.slots.get(id)?.startTime.toString()).toBe('09:00');
    });

    it('refuse une fin ramenée au début avec SLOT_END_NOT_AFTER_START', async () => {
      await expect(
        useCase.execute({ id, endTime: '09:00' }),
      ).rejects.toMatchObject({ code: 'SLOT_END_NOT_AFTER_START' });
    });

    it('refuse un fuseau inconnu avec SLOT_INVALID', async () => {
      await expect(
        useCase.execute({ id, timeZone: 'Mars/Olympus' }),
      ).rejects.toBeInstanceOf(InvalidSlotError);

      expect(repository.slots.get(id)?.timeZone.toString()).toBe(
        'Europe/Paris',
      );
    });

    it('refuse un identifiant inconnu avec SLOT_NOT_FOUND', async () => {
      await expect(
        useCase.execute({ id: UNKNOWN_ID, endTime: '11:00' }),
      ).rejects.toBeInstanceOf(SlotNotFoundError);
      await expect(
        useCase.execute({ id: UNKNOWN_ID, endTime: '11:00' }),
      ).rejects.toMatchObject({ code: 'SLOT_NOT_FOUND' });
    });

    it('ne crée pas de créneau quand l’identifiant est inconnu', async () => {
      await useCase
        .execute({ id: UNKNOWN_ID, endTime: '11:00' })
        .catch(() => undefined);

      expect(repository.slots.size).toBe(1);
      expect(repository.slots.has(UNKNOWN_ID)).toBe(false);
    });
  });
});
