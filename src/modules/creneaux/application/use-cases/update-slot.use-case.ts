import { Inject, Injectable } from '@nestjs/common';
import {
  type ISlotRepository,
  SLOT_REPOSITORY,
} from '../../domain/ports/outbound/slot.repository.port.js';
import { SlotNotFoundError } from '../../domain/errors/slot-not-found.error.js';
import { CalendarDay } from '../../domain/value-objects/calendar-day.vo.js';
import { LocalTime } from '../../domain/value-objects/local-time.vo.js';
import { SlotId } from '../../domain/value-objects/slot-id.vo.js';
import { SlotTimeZone } from '../../domain/value-objects/slot-time-zone.vo.js';
import { type UpdateSlotCommand, SlotDto } from '../dtos/slot.dto.js';

@Injectable()
export class UpdateSlotUseCase {
  constructor(
    @Inject(SLOT_REPOSITORY)
    private readonly slots: ISlotRepository,
  ) {}

  /**
   * Modifie un créneau existant : les champs absents gardent leur valeur, la série entière est concernée.
   *
   * @throws SlotNotFoundError si le créneau n'existe pas.
   * @throws InvalidSlotError si une valeur est mal formée ou hors des valeurs autorisées.
   * @throws SlotEndNotAfterStartError si la fin fusionnée n'est pas strictement postérieure au début fusionné.
   */
  async execute(command: UpdateSlotCommand): Promise<SlotDto> {
    const slot = await this.slots.findById(SlotId.create(command.id));
    if (slot === null) {
      throw new SlotNotFoundError();
    }
    const updated = slot.change({
      type: command.type,
      date:
        command.date === undefined
          ? undefined
          : CalendarDay.parse(command.date).toDate(),
      startTime:
        command.startTime === undefined
          ? undefined
          : LocalTime.parse(command.startTime),
      endTime:
        command.endTime === undefined
          ? undefined
          : LocalTime.parse(command.endTime),
      recurrence: command.recurrence,
      timeZone:
        command.timeZone === undefined
          ? undefined
          : SlotTimeZone.create(command.timeZone),
    });
    await this.slots.save(updated);
    return SlotDto.fromDomain(updated);
  }
}
