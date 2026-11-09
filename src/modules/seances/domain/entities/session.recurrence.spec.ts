import { describe, expect, it } from 'vitest';
import { InvalidSessionError } from '../errors/invalid-session.error.js';
import { Session } from './session.entity.js';

const NOW = new Date('2026-11-09T10:00:00.000Z');
const BASE = {
  date: new Date('2026-11-16T00:00:00.000Z'),
  disciplineTypeKey: 'swimming',
  durationMinutes: 60,
};

describe('Session : récurrence', () => {
  it('est non récurrente par défaut', () => {
    expect(Session.create(BASE).recurrence).toBe('aucune');
  });

  it('accepte la récurrence hebdomadaire à la création', () => {
    expect(
      Session.create({ ...BASE, recurrence: 'hebdomadaire' }).recurrence,
    ).toBe('hebdomadaire');
  });

  it('refuse une valeur de récurrence inconnue', () => {
    expect(() =>
      Session.create({ ...BASE, recurrence: 'mensuelle' as never }),
    ).toThrow(InvalidSessionError);
  });

  it('journalise le changement de récurrence et positionne modifiedManually', () => {
    const changed = Session.create(BASE).change(
      { recurrence: 'hebdomadaire' },
      NOW,
    );

    expect(changed.recurrence).toBe('hebdomadaire');
    expect(changed.modifiedManually).toBe(true);
    expect(changed.changeLog).toEqual([
      { changedAt: NOW, field: 'recurrence', previousValue: 'aucune' },
    ]);
  });

  it('ne journalise rien si la récurrence est inchangée', () => {
    const session = Session.create({ ...BASE, recurrence: 'hebdomadaire' });

    const changed = session.change({ recurrence: 'hebdomadaire' }, NOW);

    expect(changed.changeLog).toEqual([]);
    expect(changed.modifiedManually).toBe(false);
  });

  it('reconstitue une séance persistée avec sa récurrence', () => {
    const session = Session.reconstitute({
      id: Session.create(BASE).id,
      date: BASE.date,
      disciplineTypeKey: 'swimming',
      durationMinutes: 60,
      status: 'planifiee',
      modifiedManually: false,
      description: null,
      equipment: null,
      attentionPoints: null,
      modules: [],
      changeLog: [],
      recurrence: 'hebdomadaire',
    });

    expect(session.recurrence).toBe('hebdomadaire');
  });
});
