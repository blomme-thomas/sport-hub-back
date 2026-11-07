import { randomUUID } from 'node:crypto';
import { InvalidGoalError } from '../errors/invalid-goal.error.js';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class GoalId {
  private constructor(private readonly value: string) {}

  static generate(): GoalId {
    return new GoalId(randomUUID());
  }

  /** @throws InvalidGoalError si la valeur n'est pas un UUID. */
  static create(value: string): GoalId {
    if (!UUID_PATTERN.test(value)) {
      throw new InvalidGoalError(
        "l'identifiant de l'objectif n'est pas un UUID",
      );
    }
    return new GoalId(value);
  }

  equals(other: GoalId): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
