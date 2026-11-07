import type {
  CreateSlotCommand,
  ListSlotOccurrencesQuery,
  SlotDto,
  SlotOccurrencesDto,
  UpdateSlotCommand,
} from '../../../application/dtos/slot.dto.js';
import type { CreateSlotRequestDto } from '../dtos/create-slot.request.dto.js';
import type { ListSlotsRequestDto } from '../dtos/list-slots.request.dto.js';
import {
  SlotOccurrenceResponseDto,
  SlotOccurrencesResponseDto,
} from '../dtos/slot-occurrences.response.dto.js';
import { SlotResponseDto } from '../dtos/slot.response.dto.js';
import type { UpdateSlotRequestDto } from '../dtos/update-slot.request.dto.js';

export class SlotHttpMapper {
  static toCreateCommand(request: CreateSlotRequestDto): CreateSlotCommand {
    return {
      type: request.type,
      date: request.date,
      startTime: request.startTime,
      endTime: request.endTime,
      recurrence: request.recurrence,
      timeZone: request.timeZone,
    };
  }

  static toUpdateCommand(
    id: string,
    request: UpdateSlotRequestDto,
  ): UpdateSlotCommand {
    return {
      id,
      type: request.type,
      date: request.date,
      startTime: request.startTime,
      endTime: request.endTime,
      recurrence: request.recurrence,
      timeZone: request.timeZone,
    };
  }

  static toListQuery(request: ListSlotsRequestDto): ListSlotOccurrencesQuery {
    return { from: request.from, to: request.to };
  }

  static toResponse(dto: SlotDto): SlotResponseDto {
    return Object.assign(new SlotResponseDto(), {
      id: dto.id,
      type: dto.type,
      date: dto.date,
      startTime: dto.startTime,
      endTime: dto.endTime,
      recurrence: dto.recurrence,
      timeZone: dto.timeZone,
    });
  }

  static toOccurrencesResponse(
    dto: SlotOccurrencesDto,
  ): SlotOccurrencesResponseDto {
    return Object.assign(new SlotOccurrencesResponseDto(), {
      from: dto.from,
      to: dto.to,
      items: dto.items.map((item) =>
        Object.assign(new SlotOccurrenceResponseDto(), {
          slotId: item.slotId,
          type: item.type,
          date: item.date,
          startTime: item.startTime,
          endTime: item.endTime,
          recurrence: item.recurrence,
          timeZone: item.timeZone,
        }),
      ),
    });
  }
}
