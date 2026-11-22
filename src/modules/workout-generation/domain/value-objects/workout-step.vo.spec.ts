import { InvalidGeneratedWorkoutError } from '../errors/invalid-generated-workout.error.js';
import { WorkoutIntensity } from './workout-intensity.vo.js';
import { WorkoutStep } from './workout-step.vo.js';

function props(overrides: Record<string, unknown> = {}) {
  return {
    order: 1,
    label: 'Échauffement',
    durationMinutes: 10,
    intensity: WorkoutIntensity.create('easy'),
    notes: null as string | null,
    ...overrides,
  };
}

describe('WorkoutStep', () => {
  it('expose les valeurs fournies', () => {
    const step = WorkoutStep.create(
      props({ notes: 'Allure conversationnelle' }),
    );

    expect(step.order).toBe(1);
    expect(step.label).toBe('Échauffement');
    expect(step.durationMinutes).toBe(10);
    expect(step.intensity.toString()).toBe('easy');
    expect(step.notes).toBe('Allure conversationnelle');
  });

  it('accepte une durée minimale d une minute', () => {
    expect(
      WorkoutStep.create(props({ durationMinutes: 1 })).durationMinutes,
    ).toBe(1);
  });

  it.each([
    ['libellé vide', { label: '' }],
    ['libellé en espaces', { label: '   ' }],
    ['durée nulle', { durationMinutes: 0 }],
    ['durée négative', { durationMinutes: -5 }],
    ['durée décimale', { durationMinutes: 2.5 }],
    ['durée NaN', { durationMinutes: Number.NaN }],
    ['durée infinie', { durationMinutes: Number.POSITIVE_INFINITY }],
    ['ordre nul', { order: 0 }],
    ['ordre décimal', { order: 1.5 }],
    ['ordre négatif', { order: -1 }],
  ])('refuse une étape avec %s', (_label, overrides) => {
    expect(() => WorkoutStep.create(props(overrides))).toThrow(
      InvalidGeneratedWorkoutError,
    );
  });
});
