const WEEK_PATTERN = /^(\d{4})-W(\d{2})$/;
const DAY_MS = 24 * 60 * 60 * 1000;

export interface IsoWeekCalendar {
  /** Libellé `AAAA-Www`. */
  readonly label: string;
  /** Lundi de la semaine, à minuit UTC. */
  readonly monday: Date;
}

/** Renvoie la semaine ISO d'un libellé `AAAA-Www`, ou null si le format est incorrect ou si la semaine n'existe pas dans l'année. */
export function parseIsoWeek(value: string): IsoWeekCalendar | null {
  const match = WEEK_PATTERN.exec(value);
  if (match === null) {
    return null;
  }
  const year = Number(match[1]);
  const week = Number(match[2]);
  if (week < 1 || week > 53) {
    return null;
  }
  const monday = new Date(
    week1Monday(year).getTime() + (week - 1) * 7 * DAY_MS,
  );
  const thursday = new Date(monday.getTime() + 3 * DAY_MS);
  if (thursday.getUTCFullYear() !== year) {
    return null;
  }
  return { label: value, monday };
}

/** Semaine ISO qui contient le jour UTC de `date`. */
export function isoWeekContaining(date: Date): IsoWeekCalendar {
  const day = Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
  );
  const monday = day - ((new Date(day).getUTCDay() + 6) % 7) * DAY_MS;
  const thursday = new Date(monday + 3 * DAY_MS);
  const year = thursday.getUTCFullYear();
  const week =
    Math.round((monday - week1Monday(year).getTime()) / (7 * DAY_MS)) + 1;
  const label = `${year}-W${String(week).padStart(2, '0')}`;
  return { label, monday: new Date(monday) };
}

function week1Monday(year: number): Date {
  const jan4 = new Date(Date.UTC(year, 0, 4));
  return new Date(jan4.getTime() - ((jan4.getUTCDay() + 6) % 7) * DAY_MS);
}
