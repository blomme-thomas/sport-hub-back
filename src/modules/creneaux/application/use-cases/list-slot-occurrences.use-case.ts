import { Inject, Injectable } from '@nestjs/common';
import {
  type ISlotRepository,
  SLOT_REPOSITORY,
} from '../../domain/ports/outbound/slot.repository.port.js';
import { CalendarDay } from '../../domain/value-objects/calendar-day.vo.js';
import { SlotPeriod } from '../../domain/value-objects/slot-period.vo.js';
import {
  type ListSlotOccurrencesQuery,
  SlotOccurrenceDto,
  SlotOccurrencesDto,
} from '../dtos/slot.dto.js';

@Injectable()
export class ListSlotOccurrencesUseCase {
  constructor(
    @Inject(SLOT_REPOSITORY)
    private readonly slots: ISlotRepository,
  ) {}

  /**
   * Développe les créneaux sur la période (bornes incluses) et renvoie les occurrences triées par date, heure de début puis identifiant.
   * Les créneaux qui se chevauchent sont tous renvoyés.
   *
   * @throws InvalidSlotError si une date n'est pas une date calendaire réelle au format YYYY-MM-DD.
   * @throws InvalidSlotPeriodError si `to` précède `from`.
   * @throws SlotPeriodTooLargeError si la période dépasse 366 jours.
   */
  async execute(query: ListSlotOccurrencesQuery): Promise<SlotOccurrencesDto> {
    const period = SlotPeriod.create({
      from: CalendarDay.parse(query.from).toDate(),
      to: CalendarDay.parse(query.to).toDate(),
    });
    const slots = await this.slots.findIntersecting(period);
    const items = slots
      .flatMap((slot) => slot.occurrencesIn(period))
      .map((occurrence) => SlotOccurrenceDto.fromDomain(occurrence))
      .sort(compareOccurrences);
    return new SlotOccurrencesDto(query.from, query.to, items);
  }
}

function compareOccurrences(
  left: SlotOccurrenceDto,
  right: SlotOccurrenceDto,
): number {
  return (
    compareText(left.date, right.date) ||
    compareText(left.startTime, right.startTime) ||
    compareText(left.slotId, right.slotId)
  );
}

function compareText(left: string, right: string): number {
  if (left === right) {
    return 0;
  }
  return left < right ? -1 : 1;
}
