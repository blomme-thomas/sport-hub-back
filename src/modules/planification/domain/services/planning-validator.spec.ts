import { PlanningInvalidOutputError } from '../errors/planning-invalid-output.error.js';
import type { PlannedSession } from '../value-objects/planned-session.vo.js';
import type { FreeSlotCapacity } from './free-slot-capacity.calculator.js';
import { validatePlanning } from './planning-validator.js';

const FROM = '2026-11-09';
const TO = '2026-11-15';
const KEYS = new Set(['swimming', 'running']);

function capacity(date: string, availableMinutes: number): FreeSlotCapacity {
  return {
    slotId: `slot-${date}`,
    date,
    startTime: '18:00',
    endTime: '20:00',
    availableMinutes,
  };
}

function session(
  date: string,
  durationMinutes: number,
  overrides: Partial<PlannedSession> = {},
): PlannedSession {
  return {
    date,
    disciplineTypeKey: 'swimming',
    durationMinutes,
    modules: [],
    ...overrides,
  };
}

const CAPACITIES = [capacity('2026-11-10', 120), capacity('2026-11-12', 60)];

function validate(planned: PlannedSession[]): void {
  validatePlanning(planned, {
    from: FROM,
    to: TO,
    capacities: CAPACITIES,
    disciplineKeys: KEYS,
  });
}

describe('validatePlanning', () => {
  it('accepte un planning qui tient dans la capacité des jours choisis', () => {
    expect(() =>
      validate([session('2026-11-10', 60), session('2026-11-12', 60)]),
    ).not.toThrow();
  });

  it('accepte un planning vide', () => {
    expect(() => validate([])).not.toThrow();
  });

  it('refuse une séance hors de la période', () => {
    expect(() => validate([session('2026-11-20', 30)])).toThrow(
      PlanningInvalidOutputError,
    );
  });

  it('refuse une discipline absente du référentiel', () => {
    expect(() =>
      validate([session('2026-11-10', 30, { disciplineTypeKey: 'curling' })]),
    ).toThrow('discipline inconnue');
  });

  it('refuse un jour sans créneau libre', () => {
    expect(() => validate([session('2026-11-11', 30)])).toThrow(
      'capacité libre dépassée le 2026-11-11',
    );
  });

  it('refuse un total du jour qui dépasse la capacité, même réparti sur plusieurs séances', () => {
    expect(() =>
      validate([session('2026-11-10', 80), session('2026-11-10', 60)]),
    ).toThrow('capacité libre dépassée le 2026-11-10');
  });

  it('refuse des modules dont la durée dépasse celle de la séance', () => {
    const planned = session('2026-11-10', 30, {
      modules: [
        {
          type: 'series',
          durationMinutes: 20,
          instruction: 'a',
          targetZones: null,
          perceivedEffort: null,
        },
        {
          type: 'autre',
          durationMinutes: 20,
          instruction: 'b',
          targetZones: null,
          perceivedEffort: null,
        },
      ],
    });

    expect(() => validate([planned])).toThrow('les modules dépassent');
  });

  it('refuse plus de 60 séances', () => {
    const many = Array.from({ length: 61 }, () => session('2026-11-10', 1));

    expect(() => validate(many)).toThrow('plus de 60 séances');
  });
});
