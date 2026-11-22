import { Inject, Injectable } from '@nestjs/common';
import { SlotNotFoundError } from '../../domain/errors/slot-not-found.error.js';
import {
  type ISlotRepository,
  SLOT_REPOSITORY,
} from '../../domain/ports/outbound/slot.repository.port.js';
import { SlotId } from '../../domain/value-objects/slot-id.vo.js';

@Injectable()
export class DeleteSlotUseCase {
  constructor(
    @Inject(SLOT_REPOSITORY)
    private readonly slots: ISlotRepository,
  ) {}

  /**
   * Supprime le créneau et toute sa série récurrente.
   *
   * @throws SlotNotFoundError si le créneau n'existe pas.
   */
  async execute(id: string): Promise<void> {
    const slotId = SlotId.create(id);
    const slot = await this.slots.findById(slotId);
    if (slot === null) {
      throw new SlotNotFoundError();
    }
    await this.slots.delete(slotId);
  }
}
