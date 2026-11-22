import { Inject, Injectable } from '@nestjs/common';
import { DisciplineNotFoundError } from '../../domain/errors/discipline-not-found.error.js';
import {
  DISCIPLINE_REPOSITORY,
  type IDisciplineRepository,
} from '../../domain/ports/outbound/discipline.repository.port.js';
import { DisciplineLabel } from '../../domain/value-objects/discipline-label.vo.js';
import { DisciplineTypeKey } from '../../domain/value-objects/discipline-type-key.vo.js';
import {
  type RenameDisciplineCommand,
  DisciplineDto,
} from '../dtos/discipline.dto.js';

@Injectable()
export class RenameDisciplineUseCase {
  constructor(
    @Inject(DISCIPLINE_REPOSITORY)
    private readonly disciplines: IDisciplineRepository,
  ) {}

  /**
   * Remplace le libellé d'une discipline ; sa clé de type et ses dates d'apparition restent inchangées.
   *
   * @throws DisciplineNotFoundError si la clé de type est inconnue.
   * @throws InvalidDisciplineLabelError si le libellé est vide ou dépasse 60 caractères.
   * @throws InvalidDisciplineError si la clé de type est vide.
   */
  async execute(command: RenameDisciplineCommand): Promise<DisciplineDto> {
    const label = DisciplineLabel.create(command.label);
    const discipline = await this.disciplines.findByTypeKey(
      DisciplineTypeKey.create(command.typeKey),
    );
    if (discipline === null) {
      throw new DisciplineNotFoundError();
    }
    const renamed = discipline.rename(label);
    await this.disciplines.saveLabel(renamed);
    return DisciplineDto.fromDomain(renamed);
  }
}
