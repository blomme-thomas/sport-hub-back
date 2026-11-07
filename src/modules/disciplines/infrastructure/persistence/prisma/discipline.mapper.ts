import type {
  Prisma,
  Discipline as DisciplineRecord,
} from '../../../../../core/prisma/generated/client.js';
import { Discipline } from '../../../domain/entities/discipline.entity.js';
import { DisciplineLabel } from '../../../domain/value-objects/discipline-label.vo.js';
import { DisciplineTypeKey } from '../../../domain/value-objects/discipline-type-key.vo.js';

export class DisciplineMapper {
  static toDomain(record: DisciplineRecord): Discipline {
    return Discipline.reconstitute({
      typeKey: DisciplineTypeKey.create(record.typeKey),
      label: DisciplineLabel.reconstitute(record.label),
      firstSeenAt: record.firstSeenAt,
      lastSeenAt: record.lastSeenAt,
    });
  }

  static toPersistence(
    discipline: Discipline,
  ): Prisma.DisciplineUncheckedCreateInput {
    return {
      typeKey: discipline.typeKey.toString(),
      label: discipline.label.toString(),
      firstSeenAt: discipline.firstSeenAt,
      lastSeenAt: discipline.lastSeenAt,
    };
  }
}
