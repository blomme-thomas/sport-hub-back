import type { Discipline } from '../../domain/entities/discipline.entity.js';
import {
  sportFamilyOf,
  type SportFamily,
} from '../../../../shared/domain/value-objects/sport-family.vo.js';

export interface RenameDisciplineCommand {
  typeKey: string;
  label: string;
}

export class DisciplineDto {
  private constructor(
    readonly typeKey: string,
    readonly label: string,
    readonly firstSeenAt: Date,
    readonly lastSeenAt: Date,
    readonly family: SportFamily,
  ) {}

  static fromDomain(discipline: Discipline): DisciplineDto {
    return new DisciplineDto(
      discipline.typeKey.toString(),
      discipline.label.toString(),
      discipline.firstSeenAt,
      discipline.lastSeenAt,
      sportFamilyOf(discipline.typeKey.toString()),
    );
  }
}
