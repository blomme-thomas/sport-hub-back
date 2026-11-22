import { InvalidSlotError } from '../errors/invalid-slot.error.js';
import { SlotEndNotAfterStartError } from '../errors/slot-end-not-after-start.error.js';
import { LocalTime } from '../value-objects/local-time.vo.js';
import { SlotId } from '../value-objects/slot-id.vo.js';
import { SlotOccurrence } from '../value-objects/slot-occurrence.vo.js';
import type { SlotPeriod } from '../value-objects/slot-period.vo.js';
import {
  isSlotRecurrence,
  type SlotRecurrence,
} from '../value-objects/slot-recurrence.vo.js';
import { SlotTimeZone } from '../value-objects/slot-time-zone.vo.js';
import { isSlotType, type SlotType } from '../value-objects/slot-type.vo.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;

export interface SlotProps {
  type: string;
  date: Date;
  startTime: LocalTime;
  endTime: LocalTime;
  recurrence: string;
  timeZone: SlotTimeZone;
}

export interface SlotReconstitutionProps extends SlotProps {
  id: SlotId;
}

interface SlotState {
  id: SlotId;
  type: SlotType;
  date: Date;
  startTime: LocalTime;
  endTime: LocalTime;
  recurrence: SlotRecurrence;
  timeZone: SlotTimeZone;
}

export class Slot {
  private constructor(private readonly state: SlotState) {}

  /**
   * Crée un créneau avec un identifiant neuf, après validation de ses invariants.
   *
   * @throws InvalidSlotError si le type, la récurrence ou la date sont invalides.
   * @throws SlotEndNotAfterStartError si la fin n'est pas strictement postérieure au début.
   */
  static create(props: SlotProps): Slot {
    return new Slot({ id: SlotId.generate(), ...Slot.validate(props) });
  }

  /**
   * Reconstitue un créneau persisté ; les invariants sont revérifiés.
   *
   * @throws InvalidSlotError si le type, la récurrence ou la date sont invalides.
   * @throws SlotEndNotAfterStartError si la fin n'est pas strictement postérieure au début.
   */
  static reconstitute({ id, ...props }: SlotReconstitutionProps): Slot {
    return new Slot({ id, ...Slot.validate(props) });
  }

  get id(): SlotId {
    return this.state.id;
  }

  get type(): SlotType {
    return this.state.type;
  }

  get date(): Date {
    return this.state.date;
  }

  get startTime(): LocalTime {
    return this.state.startTime;
  }

  get endTime(): LocalTime {
    return this.state.endTime;
  }

  get recurrence(): SlotRecurrence {
    return this.state.recurrence;
  }

  get timeZone(): SlotTimeZone {
    return this.state.timeZone;
  }

  /**
   * Renvoie un nouveau créneau fusionnant les champs fournis avec l'état courant, sans modifier l'original.
   *
   * @throws InvalidSlotError si une valeur fusionnée est invalide.
   * @throws SlotEndNotAfterStartError si la fin fusionnée n'est pas strictement postérieure au début fusionné.
   */
  change(changes: Partial<SlotProps>): Slot {
    const current = this.state;
    return new Slot({
      id: current.id,
      ...Slot.validate({
        type: changes.type ?? current.type,
        date: changes.date ?? current.date,
        startTime: changes.startTime ?? current.startTime,
        endTime: changes.endTime ?? current.endTime,
        recurrence: changes.recurrence ?? current.recurrence,
        timeZone: changes.timeZone ?? current.timeZone,
      }),
    });
  }

  /**
   * Développe le créneau en occurrences dont le jour est dans la période (bornes incluses), triées par date.
   * Un créneau hebdomadaire a une occurrence chaque semaine à partir de sa date d'ancrage.
   */
  occurrencesIn(period: SlotPeriod): SlotOccurrence[] {
    return this.occurrenceDates(period).map(
      (date) =>
        new SlotOccurrence(
          this.state.id,
          this.state.type,
          date,
          this.state.startTime,
          this.state.endTime,
          this.state.recurrence,
          this.state.timeZone,
        ),
    );
  }

  private occurrenceDates(period: SlotPeriod): Date[] {
    const anchor = this.state.date.getTime();
    if (this.state.recurrence === 'aucune') {
      return period.contains(this.state.date) ? [new Date(anchor)] : [];
    }
    const fromMs = period.from.getTime();
    const firstStep =
      fromMs > anchor ? Math.ceil((fromMs - anchor) / WEEK_MS) : 0;
    const dates: Date[] = [];
    for (
      let time = anchor + firstStep * WEEK_MS;
      time <= period.to.getTime();
      time += WEEK_MS
    ) {
      dates.push(new Date(time));
    }
    return dates;
  }

  private static validate(props: SlotProps): Omit<SlotState, 'id'> {
    if (!isSlotType(props.type)) {
      throw new InvalidSlotError('le type doit être libre ou occupe');
    }
    if (!isSlotRecurrence(props.recurrence)) {
      throw new InvalidSlotError(
        'la récurrence doit être aucune ou hebdomadaire',
      );
    }
    if (Number.isNaN(props.date.getTime())) {
      throw new InvalidSlotError('la date est invalide');
    }
    if (props.endTime.minutes() <= props.startTime.minutes()) {
      throw new SlotEndNotAfterStartError();
    }
    return {
      type: props.type,
      date: new Date(props.date.getTime()),
      startTime: props.startTime,
      endTime: props.endTime,
      recurrence: props.recurrence,
      timeZone: props.timeZone,
    };
  }
}
