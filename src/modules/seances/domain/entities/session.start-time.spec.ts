import { describe, expect, it } from 'vitest';
import { InvalidSessionError } from '../errors/invalid-session.error.js';
import { Session } from './session.entity.js';

const NOW = new Date('2026-11-09T10:00:00.000Z');
const BASE = {
  date: new Date('2026-11-12T00:00:00.000Z'),
  disciplineTypeKey: 'running',
  durationMinutes: 45,
};

describe('Session : heure de début', () => {
  it('est absente par défaut', () => {
    expect(Session.create(BASE).startTime).toBeNull();
  });

  it('accepte une heure au format HH:MM', () => {
    expect(Session.create({ ...BASE, startTime: '07:05' }).startTime).toBe(
      '07:05',
    );
  });

  it.each(['7:05', '24:00', '18:60', '18h00', ''])('refuse %s', (value) => {
    expect(() => Session.create({ ...BASE, startTime: value })).toThrow(
      InvalidSessionError,
    );
  });

  it('journalise le changement d’heure et positionne modifiedManually', () => {
    const session = Session.create(BASE);

    const changed = session.change({ startTime: '18:00' }, NOW);

    expect(changed.startTime).toBe('18:00');
    expect(changed.modifiedManually).toBe(true);
    expect(changed.changeLog).toEqual([
      { changedAt: NOW, field: 'startTime', previousValue: null },
    ]);
  });

  it('efface l’heure avec null', () => {
    const session = Session.reconstitute({
      id: Session.create(BASE).id,
      date: BASE.date,
      disciplineTypeKey: 'running',
      durationMinutes: 45,
      startTime: '18:00',
      status: 'planifiee',
      modifiedManually: false,
      description: null,
      equipment: null,
      attentionPoints: null,
      modules: [],
      changeLog: [],
    });

    expect(session.change({ startTime: null }, NOW).startTime).toBeNull();
  });
});
