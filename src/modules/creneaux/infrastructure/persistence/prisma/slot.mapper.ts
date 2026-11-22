import type {
  Prisma,
  Slot as SlotRecord,
} from '../../../../../core/prisma/generated/client.js';
import { Slot } from '../../../domain/entities/slot.entity.js';
import { LocalTime } from '../../../domain/value-objects/local-time.vo.js';
import { SlotId } from '../../../domain/value-objects/slot-id.vo.js';
import { SlotTimeZone } from '../../../domain/value-objects/slot-time-zone.vo.js';

export class SlotMapper {
  static toDomain(record: SlotRecord): Slot {
    return Slot.reconstitute({
      id: SlotId.create(record.id),
      type: record.type,
      date: record.date,
      startTime: LocalTime.fromMinutes(record.startMinute),
      endTime: LocalTime.fromMinutes(record.endMinute),
      recurrence: record.recurrence,
      timeZone: SlotTimeZone.create(record.timeZone),
    });
  }

  static toPersistence(slot: Slot): Prisma.SlotUncheckedCreateInput {
    return {
      id: slot.id.toString(),
      type: slot.type,
      date: slot.date,
      startMinute: slot.startTime.minutes(),
      endMinute: slot.endTime.minutes(),
      recurrence: slot.recurrence,
      timeZone: slot.timeZone.toString(),
    };
  }
}
