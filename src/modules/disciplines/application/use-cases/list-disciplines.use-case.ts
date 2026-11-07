import { Inject, Injectable } from '@nestjs/common';
import {
  DISCIPLINE_REPOSITORY,
  type IDisciplineRepository,
} from '../../domain/ports/outbound/discipline.repository.port.js';
import { DisciplineDto } from '../dtos/discipline.dto.js';

@Injectable()
export class ListDisciplinesUseCase {
  constructor(
    @Inject(DISCIPLINE_REPOSITORY)
    private readonly disciplines: IDisciplineRepository,
  ) {}

  /** Liste les disciplines connues, par libellé croissant puis clé de type croissante. */
  async execute(): Promise<DisciplineDto[]> {
    const found = await this.disciplines.findAll();
    return found.map((discipline) => DisciplineDto.fromDomain(discipline));
  }
}
