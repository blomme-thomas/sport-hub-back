import { describe, expect, it } from 'vitest';
import { PauseInvalidError } from '../errors/pause-invalid.error.js';
import { Pause } from './pause.entity.js';

const VALID = {
  startDate: '2026-12-20',
  endDate: '2027-01-05',
  reason: 'vacances',
};

describe('Pause', () => {
  it('crée une pause avec un identifiant neuf', () => {
    const pause = Pause.create(VALID);

    expect(pause.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(pause).toMatchObject(VALID);
  });

  it('accepte une pause d’un seul jour', () => {
    expect(() =>
      Pause.create({
        startDate: '2026-12-20',
        endDate: '2026-12-20',
        reason: 'autre',
      }),
    ).not.toThrow();
  });

  it('refuse une fin antérieure au début', () => {
    expect(() =>
      Pause.create({
        startDate: '2026-12-20',
        endDate: '2026-12-19',
        reason: 'autre',
      }),
    ).toThrow(PauseInvalidError);
  });

  it('refuse une date qui n’existe pas', () => {
    expect(() =>
      Pause.create({
        startDate: '2026-02-30',
        endDate: '2026-03-01',
        reason: 'autre',
      }),
    ).toThrow(PauseInvalidError);
  });

  it('refuse un motif inconnu', () => {
    expect(() =>
      Pause.create({
        startDate: '2026-12-20',
        endDate: '2026-12-21',
        reason: 'fete',
      }),
    ).toThrow(PauseInvalidError);
  });

  it('change les champs fournis et revérifie les invariants', () => {
    const pause = Pause.create(VALID);

    const changed = pause.change({ endDate: '2027-01-10' });

    expect(changed).toMatchObject({ ...VALID, endDate: '2027-01-10' });
    expect(changed.id).toBe(pause.id);
    expect(() => pause.change({ endDate: '2026-12-01' })).toThrow(
      PauseInvalidError,
    );
  });
});
