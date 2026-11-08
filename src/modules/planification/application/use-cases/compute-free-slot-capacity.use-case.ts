import { Inject, Injectable } from '@nestjs/common';
import {
  type PlanningClock,
  PLANNING_CLOCK,
} from '../../domain/ports/outbound/planning-clock.port.js';
import {
  type ISessionsProvider,
  SESSIONS_PROVIDER,
} from '../../domain/ports/outbound/sessions.provider.port.js';
import {
  type ISlotOccurrencesProvider,
  SLOT_OCCURRENCES_PROVIDER,
} from '../../domain/ports/outbound/slot-occurrences.provider.port.js';
import { computeFreeSlotCapacity } from '../../domain/services/free-slot-capacity.calculator.js';
import type {
  ComputeFreeSlotCapacityQuery,
  FreeSlotCapacityDto,
} from '../dtos/free-slot-capacity.dto.js';

@Injectable()
export class ComputeFreeSlotCapacityUseCase {
  constructor(
    @Inject(SLOT_OCCURRENCES_PROVIDER)
    private readonly slots: ISlotOccurrencesProvider,
    @Inject(SESSIONS_PROVIDER)
    private readonly sessions: ISessionsProvider,
    @Inject(PLANNING_CLOCK)
    private readonly clock: PlanningClock,
  ) {}

  /**
   * Renvoie la durée disponible restante de chaque créneau libre de la période dont la date n'est pas passée, triés par date puis heure de début.
   * Les créneaux occupés et les séances fixes sont pris en compte ; voir `computeFreeSlotCapacity`.
   *
   * @throws InvalidSlotPeriodError si la période est inversée, ou SlotPeriodTooLargeError si elle dépasse 366 jours (règles du module creneaux).
   * @throws InvalidSessionError si la période de séances est invalide (règles du module seances).
   */
  async execute(
    query: ComputeFreeSlotCapacityQuery,
  ): Promise<FreeSlotCapacityDto[]> {
    const [occurrences, sessions] = await Promise.all([
      this.slots.occurrencesIn(query),
      this.sessions.sessionsIn(query),
    ]);
    return computeFreeSlotCapacity({
      today: this.clock(),
      occurrences,
      sessions,
    });
  }
}
