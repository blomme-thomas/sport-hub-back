import { PlanningInvalidOutputError } from '../errors/planning-invalid-output.error.js';
import type { FreeSlotCapacity } from './free-slot-capacity.calculator.js';
import type { PlannedSession } from '../value-objects/planned-session.vo.js';

const MAX_SESSIONS = 60;

export interface PlanningValidationInput {
  from: string;
  to: string;
  capacities: readonly FreeSlotCapacity[];
  disciplineKeys: ReadonlySet<string>;
}

/**
 * Contrôle un planning proposé avant toute écriture : jours dans la période, disciplines connues, modules qui tiennent dans la séance,
 * et temps total par jour qui tient dans la capacité restante de ce jour.
 *
 * @throws PlanningInvalidOutputError au premier écart ; aucune séance n'est alors créée.
 */
export function validatePlanning(
  planned: readonly PlannedSession[],
  input: PlanningValidationInput,
): void {
  if (planned.length > MAX_SESSIONS) {
    throw new PlanningInvalidOutputError(
      `plus de ${MAX_SESSIONS} séances proposées`,
    );
  }
  const capacityByDay = new Map<string, number>();
  for (const slot of input.capacities) {
    capacityByDay.set(
      slot.date,
      (capacityByDay.get(slot.date) ?? 0) + slot.availableMinutes,
    );
  }
  const plannedByDay = new Map<string, number>();
  for (const session of planned) {
    if (session.date < input.from || session.date > input.to) {
      throw new PlanningInvalidOutputError(
        `séance hors de la période (${session.date})`,
      );
    }
    if (!input.disciplineKeys.has(session.disciplineTypeKey)) {
      throw new PlanningInvalidOutputError(
        `discipline inconnue (${session.disciplineTypeKey})`,
      );
    }
    const modulesTotal = session.modules.reduce(
      (total, module) => total + module.durationMinutes,
      0,
    );
    if (modulesTotal > session.durationMinutes) {
      throw new PlanningInvalidOutputError(
        `les modules dépassent la durée de la séance du ${session.date}`,
      );
    }
    plannedByDay.set(
      session.date,
      (plannedByDay.get(session.date) ?? 0) + session.durationMinutes,
    );
  }
  for (const [day, minutes] of plannedByDay) {
    if (minutes > (capacityByDay.get(day) ?? 0)) {
      throw new PlanningInvalidOutputError(`capacité libre dépassée le ${day}`);
    }
  }
}
