import { Injectable } from '@nestjs/common';
import {
  DisciplineExistsUseCase,
  ListDisciplinesUseCase,
} from '../../../disciplines/index.js';
import type { IDisciplineCatalog } from '../../domain/ports/outbound/discipline-catalog.port.js';

@Injectable()
export class DisciplinesCatalogAdapter implements IDisciplineCatalog {
  constructor(
    private readonly disciplines: DisciplineExistsUseCase,
    private readonly listDisciplines: ListDisciplinesUseCase,
  ) {}

  exists(typeKey: string): Promise<boolean> {
    return this.disciplines.execute(typeKey);
  }

  async listTypeKeys(): Promise<string[]> {
    const disciplines = await this.listDisciplines.execute();
    return disciplines.map((discipline) => discipline.typeKey);
  }
}
