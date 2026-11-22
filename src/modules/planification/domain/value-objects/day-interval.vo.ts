import { InvalidPlanningIntervalError } from '../errors/invalid-planning-interval.error.js';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;
const MINUTES_PER_HOUR = 60;
const MINUTES_PER_DAY = 24 * MINUTES_PER_HOUR;

export interface DayIntervalProps {
  date: string;
  startTime: string;
  endTime: string;
}

/** Intervalle horaire d'un jour calendaire, de début inclus à fin exclue, en minutes depuis minuit. */
export class DayInterval {
  private constructor(
    readonly date: string,
    readonly startMinutes: number,
    readonly endMinutes: number,
  ) {}

  /** @throws InvalidPlanningIntervalError si la date ou une heure est mal formée, ou si la fin n'est pas après le début. */
  static create(props: DayIntervalProps): DayInterval {
    if (!DATE_PATTERN.test(props.date)) {
      throw new InvalidPlanningIntervalError(
        'la date doit être au format YYYY-MM-DD',
      );
    }
    const startMinutes = parseMinutes(props.startTime);
    const endMinutes = parseMinutes(props.endTime);
    if (endMinutes <= startMinutes) {
      throw new InvalidPlanningIntervalError('la fin doit être après le début');
    }
    if (endMinutes > MINUTES_PER_DAY) {
      throw new InvalidPlanningIntervalError('la fin dépasse la journée');
    }
    return new DayInterval(props.date, startMinutes, endMinutes);
  }

  get durationMinutes(): number {
    return this.endMinutes - this.startMinutes;
  }

  /** Minutes de cet intervalle couvertes par au moins un des intervalles donnés du même jour, chaque minute comptée une seule fois. */
  coveredMinutesBy(others: readonly DayInterval[]): number {
    const clipped = others
      .filter((other) => other.date === this.date)
      .map((other) => ({
        start: Math.max(this.startMinutes, other.startMinutes),
        end: Math.min(this.endMinutes, other.endMinutes),
      }))
      .filter((range) => range.end > range.start)
      .sort((left, right) => left.start - right.start);
    let covered = 0;
    let currentStart = -1;
    let currentEnd = -1;
    for (const range of clipped) {
      if (range.start > currentEnd) {
        covered += currentEnd - currentStart;
        currentStart = range.start;
        currentEnd = range.end;
      } else {
        currentEnd = Math.max(currentEnd, range.end);
      }
    }
    if (currentEnd > currentStart) {
      covered += currentEnd - currentStart;
    }
    return covered;
  }
}

function parseMinutes(time: string): number {
  const match = TIME_PATTERN.exec(time);
  if (match === null) {
    throw new InvalidPlanningIntervalError("l'heure doit être au format HH:mm");
  }
  return Number(match[1]) * MINUTES_PER_HOUR + Number(match[2]);
}
