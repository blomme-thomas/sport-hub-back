import { InvalidGoalError } from '../errors/invalid-goal.error.js';
import {
  type EventFormat,
  isEventFormat,
} from '../value-objects/event-format.vo.js';
import { GoalId } from '../value-objects/goal-id.vo.js';
import { type GoalType, isGoalType } from '../value-objects/goal-type.vo.js';
import type { TargetTime } from '../value-objects/target-time.vo.js';

const TITLE_MAX_LENGTH = 200;
const EVENT_TYPE: GoalType = 'evenement';

export interface GoalProps {
  title: string;
  type: string;
  targetDate?: Date | null;
  eventFormat?: string | null;
  targetTime?: TargetTime | null;
}

export interface GoalReconstitutionProps extends GoalProps {
  id: GoalId;
}

export interface GoalChanges {
  title?: string;
  type?: string;
  targetDate?: Date | null;
  eventFormat?: string | null;
  targetTime?: TargetTime | null;
}

interface GoalState {
  id: GoalId;
  title: string;
  type: GoalType;
  targetDate: Date | null;
  eventFormat: EventFormat | null;
  targetTime: TargetTime | null;
}

export class Goal {
  private constructor(private readonly state: GoalState) {}

  /**
   * Crée un objectif avec un identifiant neuf, après validation de ses invariants.
   *
   * @throws InvalidGoalError si le titre, le type, la date ou le format sont invalides, ou si le format ou le temps cible sont posés sur un objectif qui n'est pas un événement.
   */
  static create(props: GoalProps): Goal {
    return new Goal({ id: GoalId.generate(), ...Goal.validate(props) });
  }

  /**
   * Reconstitue un objectif persisté ; les invariants sont revérifiés.
   *
   * @throws InvalidGoalError si un invariant ne tient plus.
   */
  static reconstitute({ id, ...props }: GoalReconstitutionProps): Goal {
    return new Goal({ id, ...Goal.validate(props) });
  }

  get id(): GoalId {
    return this.state.id;
  }

  get title(): string {
    return this.state.title;
  }

  get type(): GoalType {
    return this.state.type;
  }

  get targetDate(): Date | null {
    return this.state.targetDate;
  }

  get eventFormat(): EventFormat | null {
    return this.state.eventFormat;
  }

  get targetTime(): TargetTime | null {
    return this.state.targetTime;
  }

  /**
   * Renvoie un nouvel objectif fusionnant les champs fournis avec l'état courant, sans modifier l'original.
   * Un champ absent (undefined) est conservé ; null efface la date, le format ou le temps cible.
   *
   * @throws InvalidGoalError si la valeur fusionnée viole un invariant, notamment un format ou un temps cible posé sur un type autre que evenement.
   */
  change(changes: GoalChanges): Goal {
    const current = this.state;
    return new Goal({
      id: current.id,
      ...Goal.validate({
        title: changes.title ?? current.title,
        type: changes.type ?? current.type,
        targetDate:
          changes.targetDate === undefined
            ? current.targetDate
            : changes.targetDate,
        eventFormat:
          changes.eventFormat === undefined
            ? current.eventFormat
            : changes.eventFormat,
        targetTime:
          changes.targetTime === undefined
            ? current.targetTime
            : changes.targetTime,
      }),
    });
  }

  /**
   * Indique si l'objectif est à venir : sa date cible est postérieure ou égale à `today`. Sans date cible, il n'est jamais à venir.
   */
  isUpcoming(today: Date): boolean {
    return (
      this.state.targetDate !== null &&
      this.state.targetDate.getTime() >= today.getTime()
    );
  }

  private static validate(props: GoalProps): Omit<GoalState, 'id'> {
    const title = props.title.trim();
    if (title.length === 0) {
      throw new InvalidGoalError('le titre ne peut pas être vide');
    }
    if (title.length > TITLE_MAX_LENGTH) {
      throw new InvalidGoalError(
        `le titre dépasse ${TITLE_MAX_LENGTH} caractères`,
      );
    }
    if (!isGoalType(props.type)) {
      throw new InvalidGoalError(
        'le type doit être evenement, volume ou regularite',
      );
    }
    const targetDate = props.targetDate ?? null;
    if (targetDate !== null && Number.isNaN(targetDate.getTime())) {
      throw new InvalidGoalError('la date cible est invalide');
    }
    const eventFormat = props.eventFormat ?? null;
    const targetTime = props.targetTime ?? null;
    if (
      props.type !== EVENT_TYPE &&
      (eventFormat !== null || targetTime !== null)
    ) {
      throw new InvalidGoalError(
        'le format et le temps cible ne sont permis que pour un événement',
      );
    }
    return {
      title,
      type: props.type,
      targetDate: targetDate === null ? null : new Date(targetDate.getTime()),
      eventFormat: validatedEventFormat(eventFormat),
      targetTime,
    };
  }
}

function validatedEventFormat(value: string | null): EventFormat | null {
  if (value === null) {
    return null;
  }
  if (!isEventFormat(value)) {
    throw new InvalidGoalError(
      'le format doit être sprint, olympique, half, full ou autre',
    );
  }
  return value;
}
