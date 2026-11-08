import { Injectable } from '@nestjs/common';
import { ListSlotOccurrencesUseCase } from '../../../creneaux/application/use-cases/list-slot-occurrences.use-case.js';
import type {
  ISlotOccurrencesProvider,
  PlanningPeriod,
} from '../../domain/ports/outbound/slot-occurrences.provider.port.js';
import type { SlotOccurrenceSnapshot } from '../../domain/services/free-slot-capacity.calculator.js';

@Injectable()
export class CreneauxOccurrencesAdapter implements ISlotOccurrencesProvider {
  constructor(private readonly occurrences: ListSlotOccurrencesUseCase) {}

  async occurrencesIn(
    period: PlanningPeriod,
  ): Promise<SlotOccurrenceSnapshot[]> {
    const result = await this.occurrences.execute(period);
    return result.items.map((item) => ({
      slotId: item.slotId,
      type: item.type,
      date: item.date,
      startTime: item.startTime,
      endTime: item.endTime,
    }));
  }
}
