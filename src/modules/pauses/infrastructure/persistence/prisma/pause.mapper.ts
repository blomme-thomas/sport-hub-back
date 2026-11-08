import type { Pause as PauseRecord } from '../../../../../core/prisma/generated/client.js';
import { Pause } from '../../../domain/entities/pause.entity.js';

function toDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export class PauseMapper {
  static toDomain(record: PauseRecord): Pause {
    return Pause.reconstitute(record.id, {
      startDate: toDateOnly(record.startDate),
      endDate: toDateOnly(record.endDate),
      reason: record.reason,
    });
  }

  static toPersistence(pause: Pause) {
    return {
      id: pause.id,
      startDate: new Date(`${pause.startDate}T00:00:00.000Z`),
      endDate: new Date(`${pause.endDate}T00:00:00.000Z`),
      reason: pause.reason,
    };
  }
}
