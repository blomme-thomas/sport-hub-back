import type { Pause } from '../../domain/entities/pause.entity.js';
import type { PauseReason } from '../../domain/value-objects/pause-reason.vo.js';

export interface CreatePauseCommand {
  startDate: string;
  endDate: string;
  reason: string;
}

export interface UpdatePauseCommand {
  id: string;
  startDate?: string;
  endDate?: string;
  reason?: string;
}

export interface ListPausesQuery {
  from?: string;
  to?: string;
}

export class PauseDto {
  private constructor(
    readonly id: string,
    readonly startDate: string,
    readonly endDate: string,
    readonly reason: PauseReason,
  ) {}

  static fromDomain(pause: Pause): PauseDto {
    return new PauseDto(pause.id, pause.startDate, pause.endDate, pause.reason);
  }
}
