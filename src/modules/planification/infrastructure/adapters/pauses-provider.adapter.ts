import { Injectable } from '@nestjs/common';
import { ListPausesUseCase } from '../../../pauses/index.js';
import type {
  IPauseProvider,
  PausedPeriod,
} from '../../domain/ports/outbound/pause-provider.port.js';
import type { PlanningPeriod } from '../../domain/ports/outbound/slot-occurrences.provider.port.js';

@Injectable()
export class PausesPauseProvider implements IPauseProvider {
  constructor(private readonly pauses: ListPausesUseCase) {}

  async pausesIn(period: PlanningPeriod): Promise<PausedPeriod[]> {
    const pauses = await this.pauses.execute({
      from: period.from,
      to: period.to,
    });
    return pauses.map((pause) => ({
      from: pause.startDate,
      to: pause.endDate,
    }));
  }
}
