import { describe, expect, it } from 'vitest';
import { Session } from '../entities/session.entity.js';
import type { SessionOccurrenceException } from '../entities/session-occurrence-exception.js';
import {
  isSeriesOccurrence,
  resolveOccurrence,
} from './session-occurrences.js';

const SERIES = Session.create({
  date: new Date('2026-11-02T00:00:00.000Z'),
  disciplineTypeKey: 'swimming',
  durationMinutes: 60,
  startTime: '18:00',
  recurrence: 'hebdomadaire',
});

function exception(
  overrides: Partial<SessionOccurrenceException> = {},
): SessionOccurrenceException {
  return {
    sessionId: SERIES.id.toString(),
    occurrenceDate: new Date('2026-11-16T00:00:00.000Z'),
    movedDate: null,
    movedStartTime: null,
    cancelled: false,
    ...overrides,
  };
}

describe('isSeriesOccurrence', () => {
  it('reconnaît chaque semaine à partir de la date de la série', () => {
    expect(
      isSeriesOccurrence(SERIES, new Date('2026-11-16T00:00:00.000Z')),
    ).toBe(true);
    expect(
      isSeriesOccurrence(SERIES, new Date('2026-11-23T00:00:00.000Z')),
    ).toBe(true);
  });

  it('rejette une date qui ne tombe pas le même jour ou qui précède la série', () => {
    expect(
      isSeriesOccurrence(SERIES, new Date('2026-11-17T00:00:00.000Z')),
    ).toBe(false);
    expect(
      isSeriesOccurrence(SERIES, new Date('2026-10-26T00:00:00.000Z')),
    ).toBe(false);
  });

  it('reconnaît uniquement la date d’une séance non récurrente', () => {
    const single = Session.create({
      date: new Date('2026-11-16T00:00:00.000Z'),
      disciplineTypeKey: 'swimming',
      durationMinutes: 60,
    });

    expect(
      isSeriesOccurrence(single, new Date('2026-11-16T00:00:00.000Z')),
    ).toBe(true);
    expect(
      isSeriesOccurrence(single, new Date('2026-11-23T00:00:00.000Z')),
    ).toBe(false);
  });
});

describe('resolveOccurrence', () => {
  it('sans exception, reprend la programmation de la série', () => {
    expect(
      resolveOccurrence(SERIES, new Date('2026-11-16T00:00:00.000Z'), null),
    ).toMatchObject({
      date: '2026-11-16',
      startTime: '18:00',
      status: 'planifiee',
    });
  });

  it('une exception déplacée prend la nouvelle date et l’heure indiquée', () => {
    const resolved = resolveOccurrence(
      SERIES,
      new Date('2026-11-16T00:00:00.000Z'),
      exception({
        movedDate: new Date('2026-11-17T00:00:00.000Z'),
        movedStartTime: '07:00',
      }),
    );

    expect(resolved).toMatchObject({ date: '2026-11-17', startTime: '07:00' });
  });

  it('une exception sans heure garde l’heure de la série', () => {
    const resolved = resolveOccurrence(
      SERIES,
      new Date('2026-11-16T00:00:00.000Z'),
      exception({ movedDate: new Date('2026-11-17T00:00:00.000Z') }),
    );

    expect(resolved.startTime).toBe('18:00');
  });

  it('une occurrence annulée a le statut annulee et garde sa date', () => {
    const resolved = resolveOccurrence(
      SERIES,
      new Date('2026-11-16T00:00:00.000Z'),
      exception({ cancelled: true }),
    );

    expect(resolved).toMatchObject({ date: '2026-11-16', status: 'annulee' });
  });
});
