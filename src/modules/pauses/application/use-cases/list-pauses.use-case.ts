import { Inject, Injectable } from '@nestjs/common';
import { PauseInvalidError } from '../../domain/errors/pause-invalid.error.js';
import {
  PAUSE_REPOSITORY,
  type IPauseRepository,
} from '../../domain/ports/outbound/pause.repository.port.js';
import { isCalendarDate } from '../../domain/value-objects/calendar-date.vo.js';
import { type ListPausesQuery, PauseDto } from '../dtos/pause.dto.js';

@Injectable()
export class ListPausesUseCase {
  constructor(
    @Inject(PAUSE_REPOSITORY)
    private readonly pauses: IPauseRepository,
  ) {}

  /**
   * Liste les pauses triées par date de début. Avec une période (bornes incluses), ne renvoie que les pauses qui la chevauchent.
   *
   * @throws PauseInvalidError si une borne n'est pas une date calendaire ou si `to` précède `from`.
   */
  async execute(query: ListPausesQuery): Promise<PauseDto[]> {
    if (query.from !== undefined && !isCalendarDate(query.from)) {
      throw new PauseInvalidError('dates calendaires attendues (AAAA-MM-JJ)');
    }
    if (query.to !== undefined && !isCalendarDate(query.to)) {
      throw new PauseInvalidError('dates calendaires attendues (AAAA-MM-JJ)');
    }
    if (
      query.from !== undefined &&
      query.to !== undefined &&
      query.to < query.from
    ) {
      throw new PauseInvalidError('la fin précède le début');
    }
    const pauses = await this.pauses.findAll(query);
    return pauses.map((pause) => PauseDto.fromDomain(pause));
  }
}
