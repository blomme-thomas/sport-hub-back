import { Activity } from '../../../domain/entities/activity.entity.js';
import { GarminActivityId } from '../../../domain/value-objects/garmin-activity-id.vo.js';
import { ActivityMapper } from './activity.mapper.js';

function record(overrides: Record<string, unknown> = {}) {
  return {
    id: '0b8d2a3e-5a43-4a53-9b5e-0f6e1c3d9a11',
    garminActivityId: '12345678901',
    type: 'running',
    startedAt: new Date('2026-05-01T06:30:00.000Z'),
    durationSeconds: 3600.5,
    distanceMeters: 10250.75 as number | null,
    rawPayload: { activityId: 12345678901, name: 'Sortie matinale' },
    createdAt: new Date('2026-05-02T00:00:00.000Z'),
    updatedAt: new Date('2026-05-02T00:00:00.000Z'),
    ...overrides,
  };
}

describe('ActivityMapper', () => {
  describe('toDomain', () => {
    it("reconstitue l'activité depuis l'enregistrement", () => {
      const activity = ActivityMapper.toDomain(record());

      expect(activity.garminActivityId.toString()).toBe('12345678901');
      expect(activity.type).toBe('running');
      expect(activity.startedAt.toISOString()).toBe('2026-05-01T06:30:00.000Z');
      expect(activity.durationSeconds).toBe(3600.5);
      expect(activity.distanceMeters).toBe(10250.75);
      expect(activity.sourcePayload).toEqual({
        activityId: 12345678901,
        name: 'Sortie matinale',
      });
    });

    it('conserve une distance nulle', () => {
      expect(
        ActivityMapper.toDomain(record({ distanceMeters: null }))
          .distanceMeters,
      ).toBeNull();
    });
  });

  describe('toPersistence', () => {
    it("traduit l'activité en données Prisma", () => {
      const activity = Activity.create({
        garminActivityId: GarminActivityId.create('42'),
        type: 'cycling',
        startedAt: new Date('2026-06-01T08:00:00.000Z'),
        durationSeconds: 1800,
        distanceMeters: null,
        sourcePayload: { activityId: 42, nested: { a: [1, 2] } },
      });

      expect(ActivityMapper.toPersistence(activity)).toMatchObject({
        garminActivityId: '42',
        type: 'cycling',
        startedAt: new Date('2026-06-01T08:00:00.000Z'),
        durationSeconds: 1800,
        distanceMeters: null,
        rawPayload: { activityId: 42, nested: { a: [1, 2] } },
      });
    });

    it("n'inclut ni identifiant interne ni horodatages de persistance", () => {
      const activity = ActivityMapper.toDomain(record());

      const data = ActivityMapper.toPersistence(activity);

      expect(data).not.toHaveProperty('id');
      expect(data).not.toHaveProperty('createdAt');
      expect(data).not.toHaveProperty('updatedAt');
    });
  });

  it('restitue une activité équivalente après un aller-retour', () => {
    const original = ActivityMapper.toDomain(record());

    const roundTrip = ActivityMapper.toDomain({
      ...record(),
      ...ActivityMapper.toPersistence(original),
    });

    expect(roundTrip.hasSameContentAs(original)).toBe(true);
    expect(roundTrip.garminActivityId.equals(original.garminActivityId)).toBe(
      true,
    );
  });
});
