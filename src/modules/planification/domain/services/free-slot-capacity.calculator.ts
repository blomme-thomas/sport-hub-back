import { DayInterval } from '../value-objects/day-interval.vo.js';

const FREE_TYPE = 'libre';
const OCCUPIED_TYPE = 'occupe';
const PLANNED_STATUS = 'planifiee';

export interface SlotOccurrenceSnapshot {
  slotId: string;
  type: string;
  date: string;
  startTime: string;
  endTime: string;
}

export interface SessionSnapshot {
  date: string;
  durationMinutes: number;
  status: string;
  modifiedManually: boolean;
  disciplineTypeKey?: string;
}

export interface FreeSlotCapacity {
  slotId: string;
  date: string;
  startTime: string;
  endTime: string;
  availableMinutes: number;
}

export interface FreeSlotCapacityInput {
  today: string;
  occurrences: readonly SlotOccurrenceSnapshot[];
  sessions: readonly SessionSnapshot[];
  /** Vrai pour réserver le temps de toutes les séances, planifiées comprises : utile quand une génération ajoute des séances sans en déplacer. */
  reserveAllSessions?: boolean;
}

interface PlacedFreeSlot {
  slotId: string;
  interval: DayInterval;
  availableMinutes: number;
}

/**
 * Calcule la durée disponible restante de chaque créneau libre à partir de today (inclus).
 * Un créneau occupé retire son temps des créneaux libres qu'il chevauche, sans compter deux fois une minute couverte par plusieurs créneaux occupés.
 * Une séance fixe (réalisée, manquée ou modifiée manuellement) consomme la capacité des créneaux libres du même jour, dans l'ordre de début ; une séance planifiée non modifiée ne consomme rien.
 * Les créneaux occupés ne sont jamais renvoyés, ni les créneaux libres dont la date est antérieure à today.
 *
 * @throws InvalidPlanningIntervalError si une occurrence a une date ou des heures invalides.
 */
export function computeFreeSlotCapacity(
  input: FreeSlotCapacityInput,
): FreeSlotCapacity[] {
  const current = input.occurrences.filter(
    (occurrence) => occurrence.date >= input.today,
  );
  const occupied = current
    .filter((occurrence) => occurrence.type === OCCUPIED_TYPE)
    .map((occurrence) => toInterval(occurrence));
  const placed: PlacedFreeSlot[] = current
    .filter((occurrence) => occurrence.type === FREE_TYPE)
    .map((occurrence) => {
      const interval = toInterval(occurrence);
      return {
        slotId: occurrence.slotId,
        interval,
        availableMinutes:
          interval.durationMinutes - interval.coveredMinutesBy(occupied),
      };
    })
    .sort(comparePlaced);

  const fixedMinutesByDate = new Map<string, number>();
  for (const session of input.sessions) {
    if (input.reserveAllSessions === true || isFixed(session)) {
      fixedMinutesByDate.set(
        session.date,
        (fixedMinutesByDate.get(session.date) ?? 0) + session.durationMinutes,
      );
    }
  }
  for (const slot of placed) {
    const remaining = fixedMinutesByDate.get(slot.interval.date) ?? 0;
    if (remaining === 0) {
      continue;
    }
    const taken = Math.min(Math.max(slot.availableMinutes, 0), remaining);
    slot.availableMinutes -= taken;
    fixedMinutesByDate.set(slot.interval.date, remaining - taken);
  }

  return placed.map((slot) => ({
    slotId: slot.slotId,
    date: slot.interval.date,
    startTime: formatMinutes(slot.interval.startMinutes),
    endTime: formatMinutes(slot.interval.endMinutes),
    availableMinutes: Math.max(slot.availableMinutes, 0),
  }));
}

function isFixed(session: SessionSnapshot): boolean {
  return session.status !== PLANNED_STATUS || session.modifiedManually;
}

function toInterval(occurrence: SlotOccurrenceSnapshot): DayInterval {
  return DayInterval.create({
    date: occurrence.date,
    startTime: occurrence.startTime,
    endTime: occurrence.endTime,
  });
}

function comparePlaced(left: PlacedFreeSlot, right: PlacedFreeSlot): number {
  return (
    compareText(left.interval.date, right.interval.date) ||
    left.interval.startMinutes - right.interval.startMinutes ||
    compareText(left.slotId, right.slotId)
  );
}

function compareText(left: string, right: string): number {
  if (left === right) {
    return 0;
  }
  return left < right ? -1 : 1;
}

function formatMinutes(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}
