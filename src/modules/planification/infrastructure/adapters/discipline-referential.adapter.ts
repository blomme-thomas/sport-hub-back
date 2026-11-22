import { Injectable } from '@nestjs/common';
import { ListDisciplinesUseCase } from '../../../disciplines/index.js';
import type {
  IDisciplineReferential,
  PlanningDiscipline,
} from '../../domain/ports/outbound/discipline-referential.port.js';

@Injectable()
export class DisciplinesReferentialAdapter implements IDisciplineReferential {
  constructor(private readonly disciplines: ListDisciplinesUseCase) {}

  async list(): Promise<PlanningDiscipline[]> {
    const disciplines = await this.disciplines.execute();
    return disciplines.map((discipline) => ({
      typeKey: discipline.typeKey,
      label: discipline.label,
    }));
  }
}
