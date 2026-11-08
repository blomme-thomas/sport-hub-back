import { Inject, Injectable } from '@nestjs/common';
import { PauseNotFoundError } from '../../domain/errors/pause-not-found.error.js';
import {
  PAUSE_REPOSITORY,
  type IPauseRepository,
} from '../../domain/ports/outbound/pause.repository.port.js';

@Injectable()
export class DeletePauseUseCase {
  constructor(
    @Inject(PAUSE_REPOSITORY)
    private readonly pauses: IPauseRepository,
  ) {}

  /**
   * Supprime une pause. Les séances existantes de la période ne sont pas modifiées.
   *
   * @throws PauseNotFoundError si la pause n'existe pas.
   */
  async execute(id: string): Promise<void> {
    const pause = await this.pauses.findById(id);
    if (pause === null) {
      throw new PauseNotFoundError();
    }
    await this.pauses.delete(id);
  }
}
