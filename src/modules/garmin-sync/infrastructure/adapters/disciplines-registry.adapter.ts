import { Injectable } from '@nestjs/common';
import { RecordDisciplineAppearancesUseCase } from '../../../disciplines/application/use-cases/record-discipline-appearances.use-case.js';
import type { IDisciplineRegistry } from '../../domain/ports/outbound/discipline-registry.port.js';

@Injectable()
export class DisciplinesRegistryAdapter implements IDisciplineRegistry {
  constructor(private readonly record: RecordDisciplineAppearancesUseCase) {}

  async recordAppearances(typeKeys: string[]): Promise<void> {
    await this.record.execute(typeKeys);
  }
}
