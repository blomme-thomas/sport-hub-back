import { Test } from '@nestjs/testing';
import { Slot } from '../../domain/entities/slot.entity.js';
import { SlotNotFoundError } from '../../domain/errors/slot-not-found.error.js';
import {
  type ISlotRepository,
  SLOT_REPOSITORY,
} from '../../domain/ports/outbound/slot.repository.port.js';
import { LocalTime } from '../../domain/value-objects/local-time.vo.js';
import type { SlotId } from '../../domain/value-objects/slot-id.vo.js';
import type { SlotPeriod } from '../../domain/value-objects/slot-period.vo.js';
import { SlotTimeZone } from '../../domain/value-objects/slot-time-zone.vo.js';
import { DeleteSlotUseCase } from './delete-slot.use-case.js';

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

function seededSlot(startTime: string): Slot {
  return Slot.create({
    type: 'occupe',
    date: new Date('2026-05-04T00:00:00.000Z'),
    startTime: LocalTime.parse(startTime),
    endTime: LocalTime.parse('23:59'),
    recurrence: 'hebdomadaire',
    timeZone: SlotTimeZone.create('Europe/Paris'),
  });
}

describe('DeleteSlotUseCase', () => {
  let useCase: DeleteSlotUseCase;
  let repository: FakeSlotRepository;

  beforeEach(async () => {
    repository = new FakeSlotRepository();
    const moduleRef = await Test.createTestingModule({
      providers: [
        DeleteSlotUseCase,
        { provide: SLOT_REPOSITORY, useValue: repository },
      ],
    }).compile();
    useCase = moduleRef.get(DeleteSlotUseCase);
  });

  describe('suppression réussie', () => {
    it('retire le créneau existant du stockage', async () => {
      const slot = seededSlot('09:00');
      await repository.save(slot);

      await useCase.execute(slot.id.toString());

      expect(repository.slots.has(slot.id.toString())).toBe(false);
    });

    it('ne supprime que le créneau ciblé', async () => {
      const target = seededSlot('09:00');
      const other = seededSlot('14:00');
      await repository.save(target);
      await repository.save(other);

      await useCase.execute(target.id.toString());

      expect(repository.slots.size).toBe(1);
      expect(repository.slots.has(other.id.toString())).toBe(true);
    });

    it('ne renvoie aucune valeur après la suppression', async () => {
      const slot = seededSlot('09:00');
      await repository.save(slot);

      await expect(
        useCase.execute(slot.id.toString()),
      ).resolves.toBeUndefined();
    });
  });

  describe('refus d’une suppression', () => {
    it('refuse un identifiant inconnu avec SLOT_NOT_FOUND', async () => {
      await expect(useCase.execute(UNKNOWN_ID)).rejects.toBeInstanceOf(
        SlotNotFoundError,
      );
      await expect(useCase.execute(UNKNOWN_ID)).rejects.toMatchObject({
        code: 'SLOT_NOT_FOUND',
      });
    });

    it('ne supprime aucun autre créneau quand l’identifiant est inconnu', async () => {
      const slot = seededSlot('09:00');
      await repository.save(slot);

      await useCase.execute(UNKNOWN_ID).catch(() => undefined);

      expect(repository.slots.size).toBe(1);
    });

    it('renvoie SLOT_NOT_FOUND à la seconde suppression du même créneau', async () => {
      const slot = seededSlot('09:00');
      await repository.save(slot);
      await useCase.execute(slot.id.toString());

      await expect(useCase.execute(slot.id.toString())).rejects.toMatchObject({
        code: 'SLOT_NOT_FOUND',
      });
    });
  });
});
