import { Inject, Injectable } from '@nestjs/common';
import { PlanningPeriodInvalidError } from '../../domain/errors/planning-period-invalid.error.js';
import {
  DISCIPLINE_REFERENTIAL,
  type IDisciplineReferential,
} from '../../domain/ports/outbound/discipline-referential.port.js';
import {
  GOAL_PROVIDER,
  type IGoalProvider,
} from '../../domain/ports/outbound/goal-provider.port.js';
import {
  PAUSE_PROVIDER,
  type IPauseProvider,
} from '../../domain/ports/outbound/pause-provider.port.js';
import {
  PLANNING_AI_GENERATOR,
  type IPlanningAiGenerator,
} from '../../domain/ports/outbound/planning-ai-generator.port.js';
import {
  PLANNING_CLOCK,
  type PlanningClock,
} from '../../domain/ports/outbound/planning-clock.port.js';
import {
  PLANNING_SCHEDULER,
  type IPlanningScheduler,
} from '../../domain/ports/outbound/planning-scheduler.port.js';
import {
  SESSIONS_PROVIDER,
  type ISessionsProvider,
} from '../../domain/ports/outbound/sessions.provider.port.js';
import {
  SLOT_OCCURRENCES_PROVIDER,
  type ISlotOccurrencesProvider,
} from '../../domain/ports/outbound/slot-occurrences.provider.port.js';
import { computeFreeSlotCapacity } from '../../domain/services/free-slot-capacity.calculator.js';
import { removePausedOccurrences } from '../../domain/services/paused-occurrences.filter.js';
import { validatePlanning } from '../../domain/services/planning-validator.js';
import type {
  GeneratePlanningQuery,
  GeneratedPlanningDto,
} from '../dtos/generate-planning.dto.js';

const MAX_PERIOD_DAYS = 366;
const DAY_IN_MILLISECONDS = 24 * 60 * 60 * 1000;

@Injectable()
export class GeneratePlanningUseCase {
  constructor(
    @Inject(SLOT_OCCURRENCES_PROVIDER)
    private readonly slots: ISlotOccurrencesProvider,
    @Inject(SESSIONS_PROVIDER)
    private readonly sessions: ISessionsProvider,
    @Inject(PLANNING_CLOCK)
    private readonly clock: PlanningClock,
    @Inject(DISCIPLINE_REFERENTIAL)
    private readonly disciplines: IDisciplineReferential,
    @Inject(GOAL_PROVIDER)
    private readonly goals: IGoalProvider,
    @Inject(PLANNING_AI_GENERATOR)
    private readonly generator: IPlanningAiGenerator,
    @Inject(PLANNING_SCHEDULER)
    private readonly scheduler: IPlanningScheduler,
    @Inject(PAUSE_PROVIDER)
    private readonly pauses: IPauseProvider,
  ) {}

  /**
   * Génère le planning d'une période, ou jusqu'à la date cible d'un objectif, avec un seul appel au modèle.
   * Les jours passés sont écartés : une période entièrement passée est refusée. Les séances existantes ne sont ni déplacées ni modifiées ; leur temps reste réservé.
   * Le planning proposé est contrôlé avant écriture : une sortie invalide n'enregistre rien.
   *
   * @throws PlanningPeriodInvalidError si la période est inversée, entièrement passée, dépasse 366 jours, ou si l'objectif n'a pas de date cible.
   * @throws GoalNotFoundError si l'objectif n'existe pas.
   * @throws PlanningGenerationUnavailableError, PlanningGenerationAccessDeniedError, PlanningInvalidOutputError : voir le port de génération.
   */
  async execute(query: GeneratePlanningQuery): Promise<GeneratedPlanningDto> {
    const today = this.clock();
    const goal = query.goalId ? await this.goals.findGoal(query.goalId) : null;
    if (goal !== null && goal.targetDate === null) {
      throw new PlanningPeriodInvalidError("l'objectif n'a pas de date cible");
    }
    const to = goal?.targetDate ?? query.to ?? null;
    if (to === null) {
      throw new PlanningPeriodInvalidError(
        'la date de fin est requise sans objectif',
      );
    }
    if (to < query.from) {
      throw new PlanningPeriodInvalidError('la fin précède le début');
    }
    if (to < today) {
      throw new PlanningPeriodInvalidError('la période est entièrement passée');
    }
    const from = query.from < today ? today : query.from;
    if (daysBetween(from, to) > MAX_PERIOD_DAYS) {
      throw new PlanningPeriodInvalidError(
        `la période dépasse ${MAX_PERIOD_DAYS} jours`,
      );
    }

    const period = { from, to };
    const [slotOccurrences, sessions, disciplines, pausedPeriods] =
      await Promise.all([
        this.slots.occurrencesIn(period),
        this.sessions.sessionsIn(period),
        this.disciplines.list(),
        this.pauses.pausesIn(period),
      ]);
    const occurrences = removePausedOccurrences(slotOccurrences, pausedPeriods);
    const capacities = computeFreeSlotCapacity({
      today,
      occurrences,
      sessions,
      reserveAllSessions: true,
    });
    const freeSlots = capacities.filter((slot) => slot.availableMinutes > 0);
    if (freeSlots.length === 0) {
      return { from, to, items: [] };
    }

    const planned = await this.generator.generate({
      from,
      to,
      freeSlots,
      existingSessions: sessions,
      disciplines,
      goal,
    });
    validatePlanning(planned, {
      from,
      to,
      capacities,
      disciplineKeys: new Set(
        disciplines.map((discipline) => discipline.typeKey),
      ),
    });
    const items = await this.scheduler.schedule(planned);
    return { from, to, items };
  }
}

function daysBetween(from: string, to: string): number {
  const start = new Date(`${from}T00:00:00.000Z`).getTime();
  const end = new Date(`${to}T00:00:00.000Z`).getTime();
  return Math.round((end - start) / DAY_IN_MILLISECONDS) + 1;
}
