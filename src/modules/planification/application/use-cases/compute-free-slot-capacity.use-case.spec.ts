import { vi } from 'vitest';
import type { ISessionsProvider } from '../../domain/ports/outbound/sessions.provider.port.js';
import type {
  ISlotOccurrencesProvider,
  PlanningPeriod,
} from '../../domain/ports/outbound/slot-occurrences.provider.port.js';
import { ComputeFreeSlotCapacityUseCase } from './compute-free-slot-capacity.use-case.js';

const PERIOD: PlanningPeriod = { from: '2026-11-09', to: '2026-11-15' };

describe('ComputeFreeSlotCapacityUseCase', () => {
  function build(
    occurrences: Awaited<ReturnType<ISlotOccurrencesProvider['occurrencesIn']>>,
    sessions: Awaited<ReturnType<ISessionsProvider['sessionsIn']>>,
    today = '2026-11-10',
  ) {
    const occurrencesIn = vi.fn().mockResolvedValue(occurrences);
    const sessionsIn = vi.fn().mockResolvedValue(sessions);
    const useCase = new ComputeFreeSlotCapacityUseCase(
      { occurrencesIn },
      { sessionsIn },
      () => today,
    );
    return { useCase, occurrencesIn, sessionsIn };
  }

  it('transmet la période aux deux sources et renvoie la capacité restante des créneaux libres', async () => {
    const { useCase, occurrencesIn, sessionsIn } = build(
      [
        {
          slotId: 'a',
          type: 'libre',
          date: '2026-11-12',
          startTime: '18:00',
          endTime: '20:00',
        },
      ],
      [
        {
          date: '2026-11-12',
          durationMinutes: 60,
          status: 'realisee',
          modifiedManually: false,
        },
      ],
    );

    const result = await useCase.execute(PERIOD);

    expect(occurrencesIn).toHaveBeenCalledWith(PERIOD);
    expect(sessionsIn).toHaveBeenCalledWith(PERIOD);
    expect(result).toEqual([
      {
        slotId: 'a',
        date: '2026-11-12',
        startTime: '18:00',
        endTime: '20:00',
        availableMinutes: 60,
      },
    ]);
  });

  it('utilise le jour renvoyé par l’horloge pour écarter les dates passées', async () => {
    const { useCase } = build(
      [
        {
          slotId: 'passe',
          type: 'libre',
          date: '2026-11-09',
          startTime: '18:00',
          endTime: '19:00',
        },
      ],
      [],
      '2026-11-10',
    );

    expect(await useCase.execute(PERIOD)).toEqual([]);
  });
});
