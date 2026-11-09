import { Session } from '../entities/session.entity.js';
import { expandOccurrences } from './session-occurrences.js';

const BASE = {
  date: new Date('2026-11-16T00:00:00.000Z'),
  disciplineTypeKey: 'swimming',
  durationMinutes: 60,
  startTime: '18:00',
};

function weekly(overrides: Partial<typeof BASE> = {}) {
  return Session.create({ ...BASE, ...overrides, recurrence: 'hebdomadaire' });
}

function dates(occurrences: { date: string }[]): string[] {
  return occurrences.map((occurrence) => occurrence.date);
}

describe('expandOccurrences', () => {
  it('renvoie une seule occurrence pour une séance non récurrente dans la période', () => {
    const session = Session.create(BASE);

    const occurrences = expandOccurrences(
      session,
      new Date('2026-11-01T00:00:00.000Z'),
      new Date('2026-11-30T00:00:00.000Z'),
    );

    expect(occurrences).toEqual([
      {
        sessionId: session.id.toString(),
        date: '2026-11-16',
        startTime: '18:00',
        durationMinutes: 60,
        disciplineTypeKey: 'swimming',
        recurrence: 'aucune',
        status: 'planifiee',
      },
    ]);
  });

  it('ne renvoie rien pour une séance non récurrente hors de la période', () => {
    const session = Session.create(BASE);

    expect(
      expandOccurrences(
        session,
        new Date('2026-12-01T00:00:00.000Z'),
        new Date('2026-12-31T00:00:00.000Z'),
      ),
    ).toEqual([]);
  });

  it('répète une séance hebdomadaire chaque semaine à partir de sa date', () => {
    const occurrences = expandOccurrences(
      weekly(),
      new Date('2026-11-16T00:00:00.000Z'),
      new Date('2026-12-07T00:00:00.000Z'),
    );

    expect(dates(occurrences)).toEqual([
      '2026-11-16',
      '2026-11-23',
      '2026-11-30',
      '2026-12-07',
    ]);
  });

  it('ne renvoie aucune occurrence antérieure à la date de la séance', () => {
    const occurrences = expandOccurrences(
      weekly(),
      new Date('2026-10-01T00:00:00.000Z'),
      new Date('2026-11-20T00:00:00.000Z'),
    );

    expect(dates(occurrences)).toEqual(['2026-11-16']);
  });

  it('commence à la première occurrence qui tombe dans la période', () => {
    const occurrences = expandOccurrences(
      weekly(),
      new Date('2026-11-20T00:00:00.000Z'),
      new Date('2026-11-30T00:00:00.000Z'),
    );

    expect(dates(occurrences)).toEqual(['2026-11-23', '2026-11-30']);
  });

  it('inclut les bornes de la période', () => {
    const occurrences = expandOccurrences(
      weekly(),
      new Date('2026-11-23T00:00:00.000Z'),
      new Date('2026-11-23T00:00:00.000Z'),
    );

    expect(dates(occurrences)).toEqual(['2026-11-23']);
  });

  it('garde la même heure et la même durée à chaque occurrence', () => {
    const occurrences = expandOccurrences(
      weekly({ durationMinutes: 45, startTime: '07:30' }),
      new Date('2026-11-16T00:00:00.000Z'),
      new Date('2026-11-23T00:00:00.000Z'),
    );

    expect(
      occurrences.map((occurrence) => [
        occurrence.startTime,
        occurrence.durationMinutes,
      ]),
    ).toEqual([
      ['07:30', 45],
      ['07:30', 45],
    ]);
  });

  it('renvoie le statut de la série à chaque occurrence', () => {
    const session = weekly();
    const changed = session.change({ status: 'manquee' }, new Date());

    const occurrences = expandOccurrences(
      changed,
      new Date('2026-11-16T00:00:00.000Z'),
      new Date('2026-11-23T00:00:00.000Z'),
    );

    expect(occurrences.map((occurrence) => occurrence.status)).toEqual([
      'manquee',
      'manquee',
    ]);
  });
});
