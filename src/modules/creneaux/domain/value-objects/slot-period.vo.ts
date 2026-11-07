import { InvalidSlotPeriodError } from '../errors/invalid-slot-period.error.js';
import { SlotPeriodTooLargeError } from '../errors/slot-period-too-large.error.js';

const DAY_MS = 24 * 60 * 60 * 1000;
export const MAX_SLOT_PERIOD_DAYS = 366;

export class SlotPeriod {
  private constructor(
    readonly from: Date,
    readonly to: Date,
  ) {}

  /**
   * Construit une période de jours calendaires, bornes incluses.
   *
   * @throws InvalidSlotPeriodError si `to` précède `from`.
   * @throws SlotPeriodTooLargeError si la période dépasse 366 jours.
   */
  static create({ from, to }: { from: Date; to: Date }): SlotPeriod {
    if (to.getTime() < from.getTime()) {
      throw new InvalidSlotPeriodError();
    }
    const days = Math.round((to.getTime() - from.getTime()) / DAY_MS) + 1;
    if (days > MAX_SLOT_PERIOD_DAYS) {
      throw new SlotPeriodTooLargeError(MAX_SLOT_PERIOD_DAYS);
    }
    return new SlotPeriod(new Date(from.getTime()), new Date(to.getTime()));
  }

  days(): number {
    return Math.round((this.to.getTime() - this.from.getTime()) / DAY_MS) + 1;
  }

  contains(date: Date): boolean {
    return (
      date.getTime() >= this.from.getTime() &&
      date.getTime() <= this.to.getTime()
    );
  }
}
