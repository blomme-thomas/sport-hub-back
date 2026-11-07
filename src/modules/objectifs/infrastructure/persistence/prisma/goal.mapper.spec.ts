import { Goal } from '../../../domain/entities/goal.entity.js';
import { TargetTime } from '../../../domain/value-objects/target-time.vo.js';
import { GoalMapper } from './goal.mapper.js';

function record(overrides: Record<string, unknown> = {}) {
  return {
    id: '0f8fad5b-d9cb-469f-a165-70867728950e',
    title: 'Triathlon de Nice',
    type: 'evenement',
    targetDate: new Date('2027-06-20T00:00:00.000Z'),
    eventFormat: 'olympique',
    targetTimeSeconds: 7200,
    createdAt: new Date('2026-11-01T00:00:00.000Z'),
    updatedAt: new Date('2026-11-01T00:00:00.000Z'),
    ...overrides,
  };
}

describe('GoalMapper', () => {
  describe('toDomain', () => {
    it('reconstitue l’objectif depuis l’enregistrement', () => {
      const goal = GoalMapper.toDomain(record());

      expect(goal.id.toString()).toBe('0f8fad5b-d9cb-469f-a165-70867728950e');
      expect(goal.title).toBe('Triathlon de Nice');
      expect(goal.type).toBe('evenement');
      expect(goal.targetDate?.toISOString()).toBe('2027-06-20T00:00:00.000Z');
      expect(goal.eventFormat).toBe('olympique');
      expect(goal.targetTime?.seconds()).toBe(7200);
    });

    it('reconstitue un objectif de volume sans champs optionnels', () => {
      const goal = GoalMapper.toDomain(
        record({
          type: 'volume',
          targetDate: null,
          eventFormat: null,
          targetTimeSeconds: null,
        }),
      );

      expect(goal.targetDate).toBeNull();
      expect(goal.eventFormat).toBeNull();
      expect(goal.targetTime).toBeNull();
    });
  });

  describe('toPersistence', () => {
    it('traduit l’objectif en données Prisma avec le temps cible en secondes', () => {
      const goal = Goal.create({
        title: 'Triathlon de Nice',
        type: 'evenement',
        targetDate: new Date('2027-06-20T00:00:00.000Z'),
        eventFormat: 'olympique',
        targetTime: TargetTime.create(7200),
      });

      expect(GoalMapper.toPersistence(goal)).toEqual({
        id: goal.id.toString(),
        title: 'Triathlon de Nice',
        type: 'evenement',
        targetDate: new Date('2027-06-20T00:00:00.000Z'),
        eventFormat: 'olympique',
        targetTimeSeconds: 7200,
      });
    });

    it('traduit les champs absents en null', () => {
      const goal = Goal.create({ title: 'Courir 500 km', type: 'volume' });

      expect(GoalMapper.toPersistence(goal)).toEqual({
        id: goal.id.toString(),
        title: 'Courir 500 km',
        type: 'volume',
        targetDate: null,
        eventFormat: null,
        targetTimeSeconds: null,
      });
    });

    it('n’inclut ni horodatages de persistance', () => {
      const data = GoalMapper.toPersistence(GoalMapper.toDomain(record()));

      expect(data).not.toHaveProperty('createdAt');
      expect(data).not.toHaveProperty('updatedAt');
    });
  });

  it('restitue un objectif équivalent après un aller-retour', () => {
    const original = GoalMapper.toDomain(record());

    const roundTrip = GoalMapper.toDomain({
      ...record(),
      ...GoalMapper.toPersistence(original),
    });

    expect(roundTrip.id.toString()).toBe(original.id.toString());
    expect(roundTrip.eventFormat).toBe('olympique');
    expect(roundTrip.targetTime?.seconds()).toBe(7200);
  });
});
