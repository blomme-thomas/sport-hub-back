import { InvalidGoalError } from '../errors/invalid-goal.error.js';
import { GoalId } from '../value-objects/goal-id.vo.js';
import { TargetTime } from '../value-objects/target-time.vo.js';
import { Goal } from './goal.entity.js';

const GOAL_ID = '0f8fad5b-d9cb-469f-a165-70867728950e';
const TITLE_MAX_LENGTH = 200;

function day(iso: string): Date {
  return new Date(`${iso}T00:00:00.000Z`);
}

function props(overrides: Record<string, unknown> = {}) {
  return {
    title: 'Triathlon de Nice',
    type: 'evenement',
    targetDate: day('2027-06-20'),
    eventFormat: 'olympique',
    targetTime: TargetTime.create(7200),
    ...overrides,
  };
}

function captureError(action: () => unknown): unknown {
  try {
    action();
  } catch (error) {
    return error;
  }
  throw new Error('aucune erreur levée');
}

describe('Goal', () => {
  describe('création', () => {
    it('expose les valeurs fournies', () => {
      const goal = Goal.create(props());

      expect(goal.title).toBe('Triathlon de Nice');
      expect(goal.type).toBe('evenement');
      expect(goal.targetDate?.toISOString()).toBe('2027-06-20T00:00:00.000Z');
      expect(goal.eventFormat).toBe('olympique');
      expect(goal.targetTime?.seconds()).toBe(7200);
    });

    it('attribue un identifiant distinct à chaque création', () => {
      const first = Goal.create(props());
      const second = Goal.create(props());

      expect(first.id.toString()).not.toBe(second.id.toString());
    });

    it('accepte un événement sans date, sans format ni temps cible', () => {
      const goal = Goal.create({ title: 'Trail des Alpes', type: 'evenement' });

      expect(goal.targetDate).toBeNull();
      expect(goal.eventFormat).toBeNull();
      expect(goal.targetTime).toBeNull();
    });

    it('accepte un objectif de volume sans date, format ni temps cible', () => {
      const goal = Goal.create({ title: 'Courir 500 km', type: 'volume' });

      expect(goal.type).toBe('volume');
      expect(goal.targetDate).toBeNull();
      expect(goal.eventFormat).toBeNull();
      expect(goal.targetTime).toBeNull();
    });

    it('accepte un objectif de régularité', () => {
      const goal = Goal.create({
        title: 'Trois séances par semaine',
        type: 'regularite',
      });

      expect(goal.type).toBe('regularite');
    });

    it('retire les espaces en début et en fin de titre', () => {
      expect(Goal.create(props({ title: '  Triathlon de Nice  ' })).title).toBe(
        'Triathlon de Nice',
      );
    });

    it(`accepte un titre de ${TITLE_MAX_LENGTH} caractères`, () => {
      const title = 'a'.repeat(TITLE_MAX_LENGTH);

      expect(Goal.create(props({ title })).title).toBe(title);
    });

    it(`refuse un titre de plus de ${TITLE_MAX_LENGTH} caractères avec GOAL_INVALID`, () => {
      const error = captureError(() =>
        Goal.create(props({ title: 'a'.repeat(TITLE_MAX_LENGTH + 1) })),
      );

      expect(error).toBeInstanceOf(InvalidGoalError);
      expect(error).toMatchObject({ code: 'GOAL_INVALID' });
    });

    it.each([
      ['chaîne vide', ''],
      ['espaces seuls', '   '],
    ])('refuse un titre %s avec GOAL_INVALID', (_label, title) => {
      expect(() => Goal.create(props({ title }))).toThrow(InvalidGoalError);
    });

    it('refuse un type hors des valeurs autorisées avec GOAL_INVALID', () => {
      expect(() => Goal.create(props({ type: 'course' }))).toThrow(
        InvalidGoalError,
      );
    });

    it('refuse un format hors des valeurs autorisées avec GOAL_INVALID', () => {
      expect(() => Goal.create(props({ eventFormat: 'marathon' }))).toThrow(
        InvalidGoalError,
      );
    });

    it.each(['volume', 'regularite'])(
      'refuse un format sur un objectif de type %s avec GOAL_INVALID',
      (type) => {
        expect(() => Goal.create(props({ type, targetTime: null }))).toThrow(
          InvalidGoalError,
        );
      },
    );

    it.each(['volume', 'regularite'])(
      'refuse un temps cible sur un objectif de type %s avec GOAL_INVALID',
      (type) => {
        expect(() => Goal.create(props({ type, eventFormat: null }))).toThrow(
          InvalidGoalError,
        );
      },
    );

    it('refuse une date invalide avec GOAL_INVALID', () => {
      expect(() =>
        Goal.create(props({ targetDate: new Date('date invalide') })),
      ).toThrow(InvalidGoalError);
    });
  });

  describe('reconstitution', () => {
    it('reconstitue un objectif avec l’identifiant fourni', () => {
      const goal = Goal.reconstitute({
        id: GoalId.create(GOAL_ID),
        ...props(),
      });

      expect(goal.id.toString()).toBe(GOAL_ID);
      expect(goal.eventFormat).toBe('olympique');
      expect(goal.targetTime?.seconds()).toBe(7200);
    });
  });

  describe('modification', () => {
    it('conserve l’identifiant de l’objectif modifié', () => {
      const goal = Goal.create(props());

      expect(goal.change({ title: 'Triathlon de Lyon' }).id.toString()).toBe(
        goal.id.toString(),
      );
    });

    it('fusionne la modification avec l’état courant', () => {
      const goal = Goal.create(props());

      const changed = goal.change({
        eventFormat: 'half',
        targetTime: TargetTime.create(21600),
      });

      expect(changed.eventFormat).toBe('half');
      expect(changed.targetTime?.seconds()).toBe(21600);
      expect(changed.title).toBe('Triathlon de Nice');
      expect(changed.type).toBe('evenement');
      expect(changed.targetDate?.toISOString()).toBe(
        '2027-06-20T00:00:00.000Z',
      );
    });

    it('ne modifie pas l’objectif d’origine', () => {
      const goal = Goal.create(props());

      goal.change({
        eventFormat: 'half',
        targetTime: TargetTime.create(21600),
      });

      expect(goal.eventFormat).toBe('olympique');
      expect(goal.targetTime?.seconds()).toBe(7200);
    });

    it('ne change rien quand la modification est vide', () => {
      const goal = Goal.create(props());

      const changed = goal.change({});

      expect(changed.title).toBe('Triathlon de Nice');
      expect(changed.eventFormat).toBe('olympique');
      expect(changed.targetTime?.seconds()).toBe(7200);
      expect(changed.targetDate?.toISOString()).toBe(
        '2027-06-20T00:00:00.000Z',
      );
    });

    it('efface le temps cible quand il est mis à null', () => {
      expect(
        Goal.create(props()).change({ targetTime: null }).targetTime,
      ).toBeNull();
    });

    it('efface le format quand il est mis à null', () => {
      expect(
        Goal.create(props()).change({ eventFormat: null }).eventFormat,
      ).toBeNull();
    });

    it('efface la date cible quand elle est mise à null', () => {
      expect(
        Goal.create(props()).change({ targetDate: null }).targetDate,
      ).toBeNull();
    });

    it('accepte une date cible déjà passée', () => {
      const changed = Goal.create(props()).change({
        targetDate: day('2020-01-01'),
      });

      expect(changed.targetDate?.toISOString()).toBe(
        '2020-01-01T00:00:00.000Z',
      );
    });

    it('refuse une date invalide lors d’une modification avec GOAL_INVALID', () => {
      expect(() =>
        Goal.create(props()).change({ targetDate: new Date('date invalide') }),
      ).toThrow(InvalidGoalError);
    });

    it('refuse un titre vide lors d’une modification avec GOAL_INVALID', () => {
      expect(() => Goal.create(props()).change({ title: '   ' })).toThrow(
        InvalidGoalError,
      );
    });

    it('refuse un type inconnu lors d’une modification avec GOAL_INVALID', () => {
      expect(() => Goal.create(props()).change({ type: 'course' })).toThrow(
        InvalidGoalError,
      );
    });

    it('refuse un format posé sur un objectif de volume avec GOAL_INVALID', () => {
      const goal = Goal.create({ title: 'Courir 500 km', type: 'volume' });

      expect(() => goal.change({ eventFormat: 'sprint' })).toThrow(
        InvalidGoalError,
      );
    });

    it('refuse le passage à un type de volume tant que le format et le temps cible sont posés', () => {
      const error = captureError(() =>
        Goal.create(props()).change({ type: 'volume' }),
      );

      expect(error).toBeInstanceOf(InvalidGoalError);
      expect(error).toMatchObject({ code: 'GOAL_INVALID' });
    });

    it('refuse le passage à un type de régularité tant que le temps cible est posé', () => {
      expect(() =>
        Goal.create(props()).change({ type: 'regularite', eventFormat: null }),
      ).toThrow(InvalidGoalError);
    });

    it('accepte le passage à un type de volume quand la même modification efface format et temps cible', () => {
      const changed = Goal.create(props()).change({
        type: 'volume',
        eventFormat: null,
        targetTime: null,
      });

      expect(changed.type).toBe('volume');
      expect(changed.eventFormat).toBeNull();
      expect(changed.targetTime).toBeNull();
    });
  });

  describe('objectif à venir', () => {
    const today = day('2026-11-07');

    it('est à venir quand la date cible est le jour même', () => {
      expect(
        Goal.create(props({ targetDate: day('2026-11-07') })).isUpcoming(today),
      ).toBe(true);
    });

    it('est à venir quand la date cible est postérieure à aujourd’hui', () => {
      expect(
        Goal.create(props({ targetDate: day('2027-06-20') })).isUpcoming(today),
      ).toBe(true);
    });

    it('n’est pas à venir quand la date cible est passée', () => {
      expect(
        Goal.create(props({ targetDate: day('2026-11-06') })).isUpcoming(today),
      ).toBe(false);
    });

    it('n’est pas à venir sans date cible', () => {
      const goal = Goal.create({ title: 'Courir 500 km', type: 'volume' });

      expect(goal.isUpcoming(today)).toBe(false);
    });
  });
});
