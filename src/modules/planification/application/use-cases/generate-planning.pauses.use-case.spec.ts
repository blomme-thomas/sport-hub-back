import { describe, expect, it, vi } from 'vitest';
import type { IDisciplineReferential } from '../../domain/ports/outbound/discipline-referential.port.js';
import type { IGoalProvider } from '../../domain/ports/outbound/goal-provider.port.js';
import type {
  IPlanningAiGenerator,
  PlanningGenerationInput,
} from '../../domain/ports/outbound/planning-ai-generator.port.js';
import type { IPlanningScheduler } from '../../domain/ports/outbound/planning-scheduler.port.js';
import type { IPauseProvider } from '../../domain/ports/outbound/pause-provider.port.js';
import type { ISessionsProvider } from '../../domain/ports/outbound/sessions.provider.port.js';
import type { ISlotOccurrencesProvider } from '../../domain/ports/outbound/slot-occurrences.provider.port.js';
import { GeneratePlanningUseCase } from './generate-planning.use-case.js';

const TODAY = '2026-11-10';

const OCCURRENCES = [
  {
    slotId: 'libre-12',
    type: 'libre',
    date: '2026-11-12',
    startTime: '18:00',
    endTime: '20:00',
  },
  {
    slotId: 'libre-13',
    type: 'libre',
    date: '2026-11-13',
    startTime: '18:00',
    endTime: '20:00',
  },
];

function build(pausedPeriods: { from: string; to: string }[]) {
  const slots: ISlotOccurrencesProvider = {
    occurrencesIn: vi.fn().mockResolvedValue(OCCURRENCES),
  };
  const sessions: ISessionsProvider = {
    sessionsIn: vi.fn().mockResolvedValue([]),
  };
  const referential: IDisciplineReferential = {
    list: vi
      .fn()
      .mockResolvedValue([{ typeKey: 'swimming', label: 'Natation' }]),
  };
  const goals: IGoalProvider = { findGoal: vi.fn() };
  const generate = vi.fn().mockResolvedValue([]);
  const generator: IPlanningAiGenerator = { generate };
  const scheduler: IPlanningScheduler = {
    schedule: vi.fn().mockResolvedValue([]),
  };
  const pauses: IPauseProvider = {
    pausesIn: vi.fn().mockResolvedValue(pausedPeriods),
  };
  const useCase = new GeneratePlanningUseCase(
    slots,
    sessions,
    () => TODAY,
    referential,
    goals,
    generator,
    scheduler,
    pauses,
  );
  return { useCase, generate, pauses };
}

describe('GeneratePlanningUseCase et pauses', () => {
  it('ne propose aucune séance et n’appelle pas le modèle si la période est entièrement en pause', async () => {
    const { useCase, generate, pauses } = build([
      { from: '2026-11-11', to: '2026-11-14' },
    ]);

    const result = await useCase.execute({
      from: '2026-11-11',
      to: '2026-11-13',
    });

    expect(pauses.pausesIn).toHaveBeenCalledWith({
      from: '2026-11-11',
      to: '2026-11-13',
    });
    expect(generate).not.toHaveBeenCalled();
    expect(result.items).toEqual([]);
  });

  it('ne transmet au modèle que les créneaux hors pause sur une période partiellement en pause', async () => {
    const { useCase, generate } = build([
      { from: '2026-11-12', to: '2026-11-12' },
    ]);

    await useCase.execute({ from: '2026-11-11', to: '2026-11-13' });

    const input = generate.mock.calls[0]?.[0] as PlanningGenerationInput;
    expect(input.freeSlots.map((slot) => slot.date)).toEqual(['2026-11-13']);
  });

  it('ne change rien quand aucune pause ne chevauche la période', async () => {
    const { useCase, generate } = build([]);

    await useCase.execute({ from: '2026-11-11', to: '2026-11-13' });

    const input = generate.mock.calls[0]?.[0] as PlanningGenerationInput;
    expect(input.freeSlots.map((slot) => slot.date)).toEqual([
      '2026-11-12',
      '2026-11-13',
    ]);
  });
});
