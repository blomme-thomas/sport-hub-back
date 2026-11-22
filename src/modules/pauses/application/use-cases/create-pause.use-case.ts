import { Inject, Injectable } from '@nestjs/common';
import { Pause } from '../../domain/entities/pause.entity.js';
import {
  PAUSE_REPOSITORY,
  type IPauseRepository,
} from '../../domain/ports/outbound/pause.repository.port.js';
import { type CreatePauseCommand, PauseDto } from '../dtos/pause.dto.js';

@Injectable()
export class CreatePauseUseCase {
  constructor(
    @Inject(PAUSE_REPOSITORY)
    private readonly pauses: IPauseRepository,
  ) {}

  /**
   * Crée une pause. La fin ne peut pas précéder le début.
   *
   * @throws PauseInvalidError si une date n'est pas calendaire, si la fin précède le début, ou si le motif est inconnu.
   */
  async execute(command: CreatePauseCommand): Promise<PauseDto> {
    const pause = Pause.create(command);
    await this.pauses.save(pause);
    return PauseDto.fromDomain(pause);
  }
}
