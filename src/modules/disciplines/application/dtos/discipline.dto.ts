import type { Discipline } from '../../domain/entities/discipline.entity.js';

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
  ) {}

  static fromDomain(discipline: Discipline): DisciplineDto {
    return new DisciplineDto(
      discipline.typeKey.toString(),
      discipline.label.toString(),
      discipline.firstSeenAt,
      discipline.lastSeenAt,
    );
  }
}
