import { randomUUID } from 'node:crypto';
import { PauseInvalidError } from '../errors/pause-invalid.error.js';
import { isCalendarDate } from '../value-objects/calendar-date.vo.js';
import {
  type PauseReason,
  isPauseReason,
} from '../value-objects/pause-reason.vo.js';

export interface PauseProps {
  startDate: string;
  endDate: string;
  reason: string;
}

export interface PauseChanges {
  startDate?: string;
  endDate?: string;
  reason?: string;
}

/** Période pendant laquelle la planification ne propose aucune séance. Bornes incluses, au format AAAA-MM-JJ. */
export class Pause {
  private constructor(
    readonly id: string,
    readonly startDate: string,
    readonly endDate: string,
    readonly reason: PauseReason,
  ) {}

  /**
   * Crée une pause avec un identifiant neuf, après validation.
   *
   * @throws PauseInvalidError si une date n'est pas calendaire, si la fin précède le début, ou si le motif est inconnu.
   */
  static create(props: PauseProps): Pause {
    const valid = Pause.validate(props);
    return new Pause(
      randomUUID(),
      valid.startDate,
      valid.endDate,
      valid.reason,
    );
  }

  /**
   * Reconstitue une pause persistée ; les invariants sont revérifiés.
   *
   * @throws PauseInvalidError si un invariant ne tient plus.
   */
  static reconstitute(id: string, props: PauseProps): Pause {
    const valid = Pause.validate(props);
    return new Pause(id, valid.startDate, valid.endDate, valid.reason);
  }

  /**
   * Renvoie une nouvelle pause fusionnant les champs fournis avec l'état courant, sans modifier l'original.
   *
   * @throws PauseInvalidError si le résultat viole un invariant.
   */
  change(changes: PauseChanges): Pause {
    return Pause.reconstitute(this.id, {
      startDate: changes.startDate ?? this.startDate,
      endDate: changes.endDate ?? this.endDate,
      reason: changes.reason ?? this.reason,
    });
  }

  private static validate(
    props: PauseProps,
  ): PauseProps & { reason: PauseReason } {
    if (!isCalendarDate(props.startDate) || !isCalendarDate(props.endDate)) {
      throw new PauseInvalidError('dates calendaires attendues (AAAA-MM-JJ)');
    }
    if (props.endDate < props.startDate) {
      throw new PauseInvalidError('la fin précède le début');
    }
    if (!isPauseReason(props.reason)) {
      throw new PauseInvalidError('motif inconnu');
    }
    return {
      startDate: props.startDate,
      endDate: props.endDate,
      reason: props.reason,
    };
  }
}
