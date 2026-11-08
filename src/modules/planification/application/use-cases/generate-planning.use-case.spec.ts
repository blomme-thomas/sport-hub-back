import { describe, expect, it, vi } from 'vitest';
import { PlanningPeriodInvalidError } from '../../domain/errors/planning-period-invalid.error.js';
import { PlanningInvalidOutputError } from '../../domain/errors/planning-invalid-output.error.js';
import type { IDisciplineReferential } from '../../domain/ports/outbound/discipline-referential.port.js';
import type {
  IGoalProvider,
  PlanningGoal,
} from '../../domain/ports/outbound/goal-provider.port.js';
import type {
  IPlanningAiGenerator,
  PlanningGenerationInput,
} from '../../domain/ports/outbound/planning-ai-generator.port.js';
import type {
  IPlanningScheduler,
  ScheduledSession,
} from '../../domain/ports/outbound/planning-scheduler.port.js';
import type { ISessionsProvider } from '../../domain/ports/outbound/sessions.provider.port.js';
import type { ISlotOccurrencesProvider } from '../../domain/ports/outbound/slot-occurrences.provider.port.js';
import type { PlannedSession } from '../../domain/value-objects/planned-session.vo.js';
import { GeneratePlanningUseCase } from './generate-planning.use-case.js';

const TODAY = '2026-11-10';
const FREE_DAY = {
  slotId: 'libre-1',
  type: 'libre',
  date: '2026-11-12',
  startTime: '18:00',
  endTime: '20:00',
};

interface Harness {
  useCase: GeneratePlanningUseCase;
  generate: ReturnType<typeof vi.fn>;
  schedule: ReturnType<typeof vi.fn>;
  findGoal: ReturnType<typeof vi.fn>;
}

function build(options: {
  occurrences?: unknown[];
  sessions?: unknown[];
  planned?: PlannedSession[];
  goal?: PlanningGoal;
}): Harness {
  const slots: ISlotOccurrencesProvider = {
    occurrencesIn: vi.fn().mockResolvedValue(options.occurrences ?? [FREE_DAY]),
  } as ISlotOccurrencesProvider;
  const sessions: ISessionsProvider = {
    sessionsIn: vi.fn().mockResolvedValue(options.sessions ?? []),
  } as ISessionsProvider;
  const referential: IDisciplineReferential = {
    list: vi
      .fn()
      .mockResolvedValue([{ typeKey: 'swimming', label: 'Natation' }]),
  };
  const findGoal = vi.fn().mockResolvedValue(options.goal);
  const goals: IGoalProvider = { findGoal };
  const generate = vi.fn().mockResolvedValue(options.planned ?? []);
  const generator: IPlanningAiGenerator = { generate };
  const schedule = vi.fn().mockImplementation((planned: PlannedSession[]) =>
    Promise.resolve(
      planned.map((session, index): ScheduledSession => ({
        id: `s${index}`,
        date: session.date,
        disciplineTypeKey: session.disciplineTypeKey,
        durationMinutes: session.durationMinutes,
      })),
    ),
  );
  const scheduler: IPlanningScheduler = { schedule };
  const useCase = new GeneratePlanningUseCase(
    slots,
    sessions,
    () => TODAY,
    referential,
    goals,
    generator,
    scheduler,
  );
  return { useCase, generate, schedule, findGoal };
}

const SWIM: PlannedSession = {
  date: '2026-11-12',
  disciplineTypeKey: 'swimming',
  durationMinutes: 45,
  modules: [],
};

describe('GeneratePlanningUseCase', () => {
  it('appelle le modèle une seule fois et crée les séances proposées', async () => {
    const harness = build({ planned: [SWIM] });

    const result = await harness.useCase.execute({
      from: '2026-11-10',
      to: '2026-11-15',
    });

    expect(harness.generate).toHaveBeenCalledTimes(1);
    expect(harness.schedule).toHaveBeenCalledWith([SWIM]);
    expect(result).toEqual({
      from: '2026-11-10',
      to: '2026-11-15',
      items: [
        {
          id: 's0',
          date: '2026-11-12',
          disciplineTypeKey: 'swimming',
          durationMinutes: 45,
        },
      ],
    });
  });

  it('transmet au modèle uniquement les créneaux libres, les séances et le référentiel', async () => {
    const harness = build({ planned: [] });

    await harness.useCase.execute({ from: '2026-11-10', to: '2026-11-15' });

    const input = harness.generate.mock.calls[0][0] as PlanningGenerationInput;
    expect(input.freeSlots).toEqual([
      {
        slotId: 'libre-1',
        date: '2026-11-12',
        startTime: '18:00',
        endTime: '20:00',
        availableMinutes: 120,
      },
    ]);
    expect(input.disciplines).toEqual([
      { typeKey: 'swimming', label: 'Natation' },
    ]);
  });

  it('ne demande rien au modèle quand aucun créneau n’est libre', async () => {
    const harness = build({ occurrences: [] });

    const result = await harness.useCase.execute({
      from: '2026-11-10',
      to: '2026-11-15',
    });

    expect(harness.generate).not.toHaveBeenCalled();
    expect(result.items).toEqual([]);
  });

  it('écarte les jours passés d’une période partiellement passée', async () => {
    const harness = build({ planned: [] });

    const result = await harness.useCase.execute({
      from: '2026-11-01',
      to: '2026-11-15',
    });

    expect(result.from).toBe(TODAY);
  });

  it('refuse une période entièrement passée', async () => {
    const harness = build({});

    await expect(
      harness.useCase.execute({ from: '2026-11-01', to: '2026-11-09' }),
    ).rejects.toBeInstanceOf(PlanningPeriodInvalidError);
    expect(harness.generate).not.toHaveBeenCalled();
  });

  it('refuse une période inversée', async () => {
    const harness = build({});

    await expect(
      harness.useCase.execute({ from: '2026-11-15', to: '2026-11-12' }),
    ).rejects.toThrow('la fin précède le début');
  });

  it('refuse une période sans fin ni objectif', async () => {
    const harness = build({});

    await expect(
      harness.useCase.execute({ from: '2026-11-10' }),
    ).rejects.toThrow('la date de fin est requise');
  });

  it('utilise la date cible de l’objectif comme fin de période', async () => {
    const harness = build({
      goal: {
        title: 'Triathlon',
        type: 'evenement',
        targetDate: '2026-11-20',
        eventFormat: 'sprint',
        targetTimeSeconds: 5400,
      },
    });

    const result = await harness.useCase.execute({
      from: '2026-11-10',
      goalId: 'g1',
    });

    expect(harness.findGoal).toHaveBeenCalledWith('g1');
    expect(result.to).toBe('2026-11-20');
  });

  it('refuse un objectif sans date cible', async () => {
    const harness = build({
      goal: {
        title: 'Courir régulièrement',
        type: 'regularite',
        targetDate: null,
        eventFormat: null,
        targetTimeSeconds: null,
      },
    });

    await expect(
      harness.useCase.execute({ from: '2026-11-10', goalId: 'g1' }),
    ).rejects.toThrow("l'objectif n'a pas de date cible");
  });

  it('ne crée rien quand le planning proposé est invalide', async () => {
    const harness = build({
      planned: [{ ...SWIM, date: '2026-11-11' }],
    });

    await expect(
      harness.useCase.execute({ from: '2026-11-10', to: '2026-11-15' }),
    ).rejects.toBeInstanceOf(PlanningInvalidOutputError);
    expect(harness.schedule).not.toHaveBeenCalled();
  });
});
