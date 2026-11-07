import { Inject, Injectable } from '@nestjs/common';
import { Slot } from '../../domain/entities/slot.entity.js';
import {
  type ISlotRepository,
  SLOT_REPOSITORY,
} from '../../domain/ports/outbound/slot.repository.port.js';
import { CalendarDay } from '../../domain/value-objects/calendar-day.vo.js';
import { LocalTime } from '../../domain/value-objects/local-time.vo.js';
import { SlotTimeZone } from '../../domain/value-objects/slot-time-zone.vo.js';
import { type CreateSlotCommand, SlotDto } from '../dtos/slot.dto.js';

const DEFAULT_RECURRENCE = 'aucune';
const DEFAULT_TIME_ZONE = 'Europe/Paris';

@Injectable()
export class CreateSlotUseCase {
  constructor(
    @Inject(SLOT_REPOSITORY)
    private readonly slots: ISlotRepository,
  ) {}

  /**
   * Crée et enregistre un créneau. Sans récurrence ni fuseau fournis, le créneau est ponctuel en Europe/Paris.
   *
   * @throws InvalidSlotError si un champ est mal formé ou hors des valeurs autorisées.
   * @throws SlotEndNotAfterStartError si la fin n'est pas strictement postérieure au début.
   */
  async execute(command: CreateSlotCommand): Promise<SlotDto> {
    const slot = Slot.create({
      type: command.type,
      date: CalendarDay.parse(command.date).toDate(),
      startTime: LocalTime.parse(command.startTime),
      endTime: LocalTime.parse(command.endTime),
      recurrence: command.recurrence ?? DEFAULT_RECURRENCE,
      timeZone: SlotTimeZone.create(command.timeZone ?? DEFAULT_TIME_ZONE),
    });
    await this.slots.save(slot);
    return SlotDto.fromDomain(slot);
  }
}
