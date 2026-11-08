import { randomUUID } from 'node:crypto';
import { InvalidSessionError } from '../errors/invalid-session.error.js';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class SessionId {
  private constructor(private readonly value: string) {}

  static generate(): SessionId {
    return new SessionId(randomUUID());
  }

  /** @throws InvalidSessionError si la valeur n'est pas un UUID. */
  static create(value: string): SessionId {
    if (!UUID_PATTERN.test(value)) {
      throw new InvalidSessionError(
        "l'identifiant de la séance n'est pas un UUID",
      );
    }
    return new SessionId(value);
  }

  equals(other: SessionId): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
