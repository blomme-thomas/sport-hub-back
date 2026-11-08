import { Inject, Injectable } from '@nestjs/common';
import { InvalidDisciplineError } from '../../domain/errors/invalid-discipline.error.js';
import {
  DISCIPLINE_REPOSITORY,
  type IDisciplineRepository,
} from '../../domain/ports/outbound/discipline.repository.port.js';
import { DisciplineTypeKey } from '../../domain/value-objects/discipline-type-key.vo.js';

@Injectable()
export class DisciplineExistsUseCase {
  constructor(
    @Inject(DISCIPLINE_REPOSITORY)
    private readonly disciplines: IDisciplineRepository,
  ) {}

  /**
   * Indique si une discipline portant cette clé existe dans le référentiel ; une clé vide ou trop longue renvoie faux.
   */
  async execute(typeKey: string): Promise<boolean> {
    let key: DisciplineTypeKey;
    try {
      key = DisciplineTypeKey.create(typeKey);
    } catch (error) {
      if (error instanceof InvalidDisciplineError) {
        return false;
      }
      throw error;
    }
    return (await this.disciplines.findByTypeKey(key)) !== null;
  }
}
