import type { LocalTime } from './local-time.vo.js';
import type { SlotId } from './slot-id.vo.js';
import type { SlotRecurrence } from './slot-recurrence.vo.js';
import type { SlotTimeZone } from './slot-time-zone.vo.js';
import type { SlotType } from './slot-type.vo.js';

export class SlotOccurrence {
  constructor(
    readonly slotId: SlotId,
    readonly type: SlotType,
    readonly date: Date,
    readonly startTime: LocalTime,
    readonly endTime: LocalTime,
    readonly recurrence: SlotRecurrence,
    readonly timeZone: SlotTimeZone,
  ) {}
}
