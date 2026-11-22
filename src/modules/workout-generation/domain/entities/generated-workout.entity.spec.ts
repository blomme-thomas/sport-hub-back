import { InvalidGeneratedWorkoutError } from '../errors/invalid-generated-workout.error.js';
import { WorkoutIntensity } from '../value-objects/workout-intensity.vo.js';
import { WorkoutStep } from '../value-objects/workout-step.vo.js';
import { GeneratedWorkout } from './generated-workout.entity.js';

function step(
  order: number,
  durationMinutes: number,
  intensity = 'easy',
): WorkoutStep {
  return WorkoutStep.create({
    order,
    label: `Étape ${order}`,
    durationMinutes,
    intensity: WorkoutIntensity.create(intensity),
    notes: null,
  });
}

function props(overrides: Record<string, unknown> = {}) {
  return {
    title: 'Fractionné court',
    sport: 'running',
    summary: 'Échauffement, fractions, retour au calme.',
    totalDurationMinutes: 45,
    steps: [step(1, 10), step(2, 25, 'hard'), step(3, 10)],
    ...overrides,
  };
}

describe('GeneratedWorkout', () => {
  describe('création valide', () => {
    it('expose le titre, le sport, le résumé, la durée et les étapes', () => {
      const workout = GeneratedWorkout.create(props());

      expect(workout.title).toBe('Fractionné court');
      expect(workout.sport).toBe('running');
      expect(workout.summary).toBe('Échauffement, fractions, retour au calme.');
      expect(workout.totalDurationMinutes).toBe(45);
      expect(workout.steps.map((s) => s.label)).toEqual([
        'Étape 1',
        'Étape 2',
        'Étape 3',
      ]);
    });

    it('accepte une séance d une seule étape', () => {
      const workout = GeneratedWorkout.create(
        props({ totalDurationMinutes: 30, steps: [step(1, 30)] }),
      );

      expect(workout.steps).toHaveLength(1);
    });

    it.each([
      ['minimale', 5],
      ['maximale', 300],
    ])('accepte une durée totale %s à la borne', (_label, total) => {
      const workout = GeneratedWorkout.create(
        props({ totalDurationMinutes: total, steps: [step(1, total)] }),
      );

      expect(workout.totalDurationMinutes).toBe(total);
    });

    it('ne laisse pas modifier de l extérieur la liste des étapes', () => {
      const workout = GeneratedWorkout.create(props());

      (workout.steps as WorkoutStep[]).push(step(4, 5));

      expect(workout.steps).toHaveLength(3);
    });
  });

  describe('invariants refusés', () => {
    it.each([
      ['titre vide', { title: '' }],
      ['titre en espaces', { title: '   ' }],
    ])('refuse un %s', (_label, overrides) => {
      expect(() => GeneratedWorkout.create(props(overrides))).toThrow(
        InvalidGeneratedWorkoutError,
      );
    });

    it('refuse une séance sans étape', () => {
      expect(() =>
        GeneratedWorkout.create(props({ steps: [], totalDurationMinutes: 45 })),
      ).toThrow(InvalidGeneratedWorkoutError);
    });

    it('refuse une durée totale différente de la somme des étapes', () => {
      expect(() =>
        GeneratedWorkout.create(props({ totalDurationMinutes: 50 })),
      ).toThrow(InvalidGeneratedWorkoutError);
    });

    it('refuse une durée totale inférieure à la somme des étapes', () => {
      expect(() =>
        GeneratedWorkout.create(props({ totalDurationMinutes: 40 })),
      ).toThrow(InvalidGeneratedWorkoutError);
    });

    it.each([
      ['en dessous de 5 minutes', 4],
      ['au-dessus de 300 minutes', 301],
      ['nulle', 0],
    ])('refuse une durée totale %s', (_label, total) => {
      expect(() =>
        GeneratedWorkout.create(
          props({ totalDurationMinutes: total, steps: [step(1, total)] }),
        ),
      ).toThrow(InvalidGeneratedWorkoutError);
    });

    it('refuse des étapes dont l ordre ne commence pas à 1', () => {
      expect(() =>
        GeneratedWorkout.create(
          props({
            totalDurationMinutes: 20,
            steps: [step(2, 10), step(3, 10)],
          }),
        ),
      ).toThrow(InvalidGeneratedWorkoutError);
    });

    it('refuse des étapes dont l ordre présente un trou', () => {
      expect(() =>
        GeneratedWorkout.create(
          props({
            totalDurationMinutes: 20,
            steps: [step(1, 10), step(3, 10)],
          }),
        ),
      ).toThrow(InvalidGeneratedWorkoutError);
    });

    it('refuse des étapes dont l ordre est inversé', () => {
      expect(() =>
        GeneratedWorkout.create(
          props({
            totalDurationMinutes: 20,
            steps: [step(2, 10), step(1, 10)],
          }),
        ),
      ).toThrow(InvalidGeneratedWorkoutError);
    });

    it('refuse deux étapes de même ordre', () => {
      expect(() =>
        GeneratedWorkout.create(
          props({
            totalDurationMinutes: 20,
            steps: [step(1, 10), step(1, 10)],
          }),
        ),
      ).toThrow(InvalidGeneratedWorkoutError);
    });
  });
});
