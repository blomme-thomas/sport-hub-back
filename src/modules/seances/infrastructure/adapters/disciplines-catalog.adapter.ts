import { Injectable } from '@nestjs/common';
import { DisciplineExistsUseCase } from '../../../disciplines/index.js';
import type { IDisciplineCatalog } from '../../domain/ports/outbound/discipline-catalog.port.js';

@Injectable()
export class DisciplinesCatalogAdapter implements IDisciplineCatalog {
  constructor(private readonly disciplines: DisciplineExistsUseCase) {}

  exists(typeKey: string): Promise<boolean> {
    return this.disciplines.execute(typeKey);
  }
}
