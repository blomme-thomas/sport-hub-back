import { Inject, Injectable } from '@nestjs/common';
import { PauseNotFoundError } from '../../domain/errors/pause-not-found.error.js';
import {
  PAUSE_REPOSITORY,
  type IPauseRepository,
} from '../../domain/ports/outbound/pause.repository.port.js';
import { type UpdatePauseCommand, PauseDto } from '../dtos/pause.dto.js';

@Injectable()
export class UpdatePauseUseCase {
  constructor(
    @Inject(PAUSE_REPOSITORY)
    private readonly pauses: IPauseRepository,
  ) {}

  /**
   * Modifie une pause : les champs absents gardent leur valeur. Les invariants sont revérifiés sur le résultat.
   *
   * @throws PauseNotFoundError si la pause n'existe pas.
   * @throws PauseInvalidError si le résultat viole un invariant.
   */
  async execute(command: UpdatePauseCommand): Promise<PauseDto> {
    const pause = await this.pauses.findById(command.id);
    if (pause === null) {
      throw new PauseNotFoundError();
    }
    const updated = pause.change({
      startDate: command.startDate,
      endDate: command.endDate,
      reason: command.reason,
    });
    await this.pauses.save(updated);
    return PauseDto.fromDomain(updated);
  }
}
