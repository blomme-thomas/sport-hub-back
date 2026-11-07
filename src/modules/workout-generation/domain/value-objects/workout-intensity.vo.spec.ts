import { InvalidGeneratedWorkoutError } from '../errors/invalid-generated-workout.error.js';
import { WorkoutIntensity } from './workout-intensity.vo.js';

describe('WorkoutIntensity', () => {
  it.each(['easy', 'moderate', 'hard'])('accepte l intensité %s', (value) => {
    expect(WorkoutIntensity.create(value).toString()).toBe(value);
  });

  it.each([
    ['vide', ''],
    ['inconnue', 'max'],
    ['en majuscules', 'EASY'],
    ['en français', 'facile'],
  ])('refuse une intensité %s', (_label, value) => {
    expect(() => WorkoutIntensity.create(value)).toThrow(
      InvalidGeneratedWorkoutError,
    );
  });

  it('considère égales deux intensités de même niveau', () => {
    expect(
      WorkoutIntensity.create('hard').equals(WorkoutIntensity.create('hard')),
    ).toBe(true);
  });

  it('considère différentes deux intensités de niveaux distincts', () => {
    expect(
      WorkoutIntensity.create('easy').equals(WorkoutIntensity.create('hard')),
    ).toBe(false);
  });
});
