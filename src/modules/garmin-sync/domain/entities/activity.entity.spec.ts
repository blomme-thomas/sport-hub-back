import { InvalidActivityError } from '../errors/invalid-activity.error.js';
import { GarminActivityId } from '../value-objects/garmin-activity-id.vo.js';
import { Activity } from './activity.entity.js';

function props(overrides: Record<string, unknown> = {}) {
  return {
    garminActivityId: GarminActivityId.create('12345678901'),
    type: 'running',
    startedAt: new Date('2026-05-01T06:30:00.000Z'),
    durationSeconds: 3600.5,
    distanceMeters: 10250.75 as number | null,
    sourcePayload: {
      activityId: 12345678901,
      nested: { name: 'Sortie matinale', laps: [1, 2] },
    } as unknown,
    ...overrides,
  };
}

describe('Activity', () => {
  describe('création', () => {
    it('expose les valeurs fournies', () => {
      const activity = Activity.create(props());

      expect(activity.garminActivityId.toString()).toBe('12345678901');
      expect(activity.type).toBe('running');
      expect(activity.startedAt.toISOString()).toBe('2026-05-01T06:30:00.000Z');
      expect(activity.durationSeconds).toBe(3600.5);
      expect(activity.distanceMeters).toBe(10250.75);
      expect(activity.sourcePayload).toEqual(props().sourcePayload);
    });

    it('accepte une distance nulle', () => {
      expect(
        Activity.create(props({ distanceMeters: null })).distanceMeters,
      ).toBeNull();
    });

    it('accepte une durée nulle et une distance nulle en mètres', () => {
      const activity = Activity.create(
        props({ durationSeconds: 0, distanceMeters: 0 }),
      );

      expect(activity.durationSeconds).toBe(0);
      expect(activity.distanceMeters).toBe(0);
    });

    it.each([
      ['type vide', { type: '' }],
      ['type en espaces', { type: '   ' }],
      ['date de début invalide', { startedAt: new Date('pas une date') }],
      ['durée négative', { durationSeconds: -1 }],
      ['durée NaN', { durationSeconds: Number.NaN }],
      ['durée infinie', { durationSeconds: Number.POSITIVE_INFINITY }],
      ['distance négative', { distanceMeters: -0.5 }],
      ['distance NaN', { distanceMeters: Number.NaN }],
      ['distance infinie', { distanceMeters: Number.POSITIVE_INFINITY }],
    ])('refuse %s avec ACTIVITY_INVALID', (_label, overrides) => {
      expect(() => Activity.create(props(overrides))).toThrow(
        InvalidActivityError,
      );
    });

    it('porte le code ACTIVITY_INVALID', () => {
      try {
        Activity.create(props({ type: '' }));
        expect.unreachable();
      } catch (error) {
        expect((error as InvalidActivityError).code).toBe('ACTIVITY_INVALID');
      }
    });
  });

  describe('reconstitution', () => {
    it('reconstitue une activité avec les mêmes valeurs', () => {
      const activity = Activity.reconstitute(props());

      expect(activity.garminActivityId.toString()).toBe('12345678901');
      expect(activity.type).toBe('running');
      expect(activity.durationSeconds).toBe(3600.5);
    });
  });

  describe('hasSameContentAs', () => {
    it('est vrai pour un payload profondément égal', () => {
      const a = Activity.create(props());
      const b = Activity.create(
        props({
          sourcePayload: {
            activityId: 12345678901,
            nested: { name: 'Sortie matinale', laps: [1, 2] },
          },
        }),
      );

      expect(a.hasSameContentAs(b)).toBe(true);
    });

    it('est faux quand une valeur imbriquée du payload change', () => {
      const a = Activity.create(props());
      const b = Activity.create(
        props({
          sourcePayload: {
            activityId: 12345678901,
            nested: { name: 'Sortie du soir', laps: [1, 2] },
          },
        }),
      );

      expect(a.hasSameContentAs(b)).toBe(false);
    });

    it('est faux quand un tableau du payload change', () => {
      const a = Activity.create(props());
      const b = Activity.create(
        props({
          sourcePayload: {
            activityId: 12345678901,
            nested: { name: 'Sortie matinale', laps: [1, 2, 3] },
          },
        }),
      );

      expect(a.hasSameContentAs(b)).toBe(false);
    });

    it('est faux quand une clé est ajoutée au payload', () => {
      const a = Activity.create(props());
      const b = Activity.create(
        props({
          sourcePayload: {
            activityId: 12345678901,
            nested: { name: 'Sortie matinale', laps: [1, 2] },
            extra: true,
          },
        }),
      );

      expect(a.hasSameContentAs(b)).toBe(false);
    });
  });
});
