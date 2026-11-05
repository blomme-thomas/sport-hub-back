import { DomainError } from './domain-error.js';

class WorkoutNotFoundError extends DomainError {
  readonly code = 'WORKOUT_NOT_FOUND';
  constructor(id: string, options?: { cause?: unknown }) {
    super(`Workout ${id} not found`, options);
  }
}

describe('DomainError', () => {
  it('expose le code stable défini par la sous-classe', () => {
    expect(new WorkoutNotFoundError('42').code).toBe('WORKOUT_NOT_FOUND');
  });

  it('porte le message métier', () => {
    expect(new WorkoutNotFoundError('42').message).toBe('Workout 42 not found');
  });

  it('prend pour name celui de la sous-classe', () => {
    expect(new WorkoutNotFoundError('42').name).toBe('WorkoutNotFoundError');
  });

  it('est une Error et une DomainError', () => {
    const error = new WorkoutNotFoundError('42');
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(DomainError);
    expect(error).toBeInstanceOf(WorkoutNotFoundError);
  });

  it('conserve la cause fournie', () => {
    const cause = new Error('origine');
    expect(new WorkoutNotFoundError('42', { cause }).cause).toBe(cause);
  });

  it('est sans cause par défaut', () => {
    expect(new WorkoutNotFoundError('42').cause).toBeUndefined();
  });

  it('conserve une stack', () => {
    expect(new WorkoutNotFoundError('42').stack).toContain(
      'WorkoutNotFoundError',
    );
  });
});
