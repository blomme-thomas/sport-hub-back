import type { Slot } from '../../domain/entities/slot.entity.js';
import { CalendarDay } from '../../domain/value-objects/calendar-day.vo.js';
import type { SlotOccurrence } from '../../domain/value-objects/slot-occurrence.vo.js';
import type { SlotRecurrence } from '../../domain/value-objects/slot-recurrence.vo.js';
import type { SlotType } from '../../domain/value-objects/slot-type.vo.js';

export interface CreateSlotCommand {
  type: string;
  date: string;
  startTime: string;
  endTime: string;
  recurrence?: string;
  timeZone?: string;
}

export interface UpdateSlotCommand {
  id: string;
  type?: string;
  date?: string;
  startTime?: string;
  endTime?: string;
  recurrence?: string;
  timeZone?: string;
}

export interface ListSlotOccurrencesQuery {
  from: string;
  to: string;
}

export class SlotDto {
  private constructor(
    readonly id: string,
    readonly type: SlotType,
    readonly date: string,
    readonly startTime: string,
    readonly endTime: string,
    readonly recurrence: SlotRecurrence,
    readonly timeZone: string,
  ) {}

  static fromDomain(slot: Slot): SlotDto {
    return new SlotDto(
      slot.id.toString(),
      slot.type,
      CalendarDay.fromDate(slot.date).toString(),
      slot.startTime.toString(),
      slot.endTime.toString(),
      slot.recurrence,
      slot.timeZone.toString(),
    );
  }
}

export class SlotOccurrenceDto {
  private constructor(
    readonly slotId: string,
    readonly type: SlotType,
    readonly date: string,
    readonly startTime: string,
    readonly endTime: string,
    readonly recurrence: SlotRecurrence,
    readonly timeZone: string,
  ) {}

  static fromDomain(occurrence: SlotOccurrence): SlotOccurrenceDto {
    return new SlotOccurrenceDto(
      occurrence.slotId.toString(),
      occurrence.type,
      CalendarDay.fromDate(occurrence.date).toString(),
      occurrence.startTime.toString(),
      occurrence.endTime.toString(),
      occurrence.recurrence,
      occurrence.timeZone.toString(),
    );
  }
}

export class SlotOccurrencesDto {
  constructor(
    readonly from: string,
    readonly to: string,
    readonly items: SlotOccurrenceDto[],
  ) {}
}
