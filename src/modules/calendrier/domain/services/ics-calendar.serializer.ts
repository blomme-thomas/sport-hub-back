const LINE_LIMIT_OCTETS = 75;
const CRLF = '\r\n';
const MINUTES_PER_DAY = 24 * 60;
export const CALENDAR_TIME_ZONE = 'Europe/Paris';

export interface IcsTimedStart {
  time: string;
  durationMinutes: number;
}

export interface IcsEvent {
  uid: string;
  date: string;
  summary: string;
  start?: IcsTimedStart;
}

const PARIS_TIME_ZONE_LINES = [
  'BEGIN:VTIMEZONE',
  `TZID:${CALENDAR_TIME_ZONE}`,
  'BEGIN:DAYLIGHT',
  'TZOFFSETFROM:+0100',
  'TZOFFSETTO:+0200',
  'TZNAME:CEST',
  'DTSTART:19700329T020000',
  'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU',
  'END:DAYLIGHT',
  'BEGIN:STANDARD',
  'TZOFFSETFROM:+0200',
  'TZOFFSETTO:+0100',
  'TZNAME:CET',
  'DTSTART:19701025T030000',
  'RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU',
  'END:STANDARD',
  'END:VTIMEZONE',
];

/**
 * Produit un calendrier ICS (RFC 5545). Une séance avec heure de début devient un événement horodaté (fuseau Europe/Paris, fin = début + durée) ;
 * sans heure, un événement journée entière. Les textes sont échappés et les lignes repliées à 75 octets.
 */
export function serializeIcsCalendar(
  events: readonly IcsEvent[],
  stamp: Date,
): string {
  const dtstamp = formatUtcStamp(stamp);
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//sport-hub//calendrier//FR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    ...PARIS_TIME_ZONE_LINES,
    ...events.flatMap((event) => eventLines(event, dtstamp)),
    'END:VCALENDAR',
  ];
  return lines.map(foldLine).join(CRLF) + CRLF;
}

function eventLines(event: IcsEvent, dtstamp: string): string[] {
  return [
    'BEGIN:VEVENT',
    `UID:${escapeText(event.uid)}`,
    `DTSTAMP:${dtstamp}`,
    ...boundaryLines(event),
    `SUMMARY:${escapeText(event.summary)}`,
    'TRANSP:TRANSPARENT',
    'END:VEVENT',
  ];
}

function boundaryLines(event: IcsEvent): string[] {
  if (event.start === undefined) {
    return [`DTSTART;VALUE=DATE:${compactDate(event.date)}`];
  }
  const { start, end } = timedBoundaries(event.date, event.start);
  return [
    `DTSTART;TZID=${CALENDAR_TIME_ZONE}:${start}`,
    `DTEND;TZID=${CALENDAR_TIME_ZONE}:${end}`,
  ];
}

function timedBoundaries(
  date: string,
  { time, durationMinutes }: IcsTimedStart,
): { start: string; end: string } {
  const [hours, minutes] = time.split(':').map(Number) as [number, number];
  const startMinutes = hours * 60 + minutes;
  const endTotal = startMinutes + durationMinutes;
  const endDate = addDays(date, Math.floor(endTotal / MINUTES_PER_DAY));
  const endMinutes = endTotal % MINUTES_PER_DAY;
  return {
    start: `${compactDate(date)}T${pad(hours)}${pad(minutes)}00`,
    end: `${compactDate(endDate)}T${pad(Math.floor(endMinutes / 60))}${pad(endMinutes % 60)}00`,
  };
}

function addDays(date: string, days: number): string {
  const shifted = new Date(`${date}T00:00:00.000Z`);
  shifted.setUTCDate(shifted.getUTCDate() + days);
  return shifted.toISOString().slice(0, 10);
}

function compactDate(date: string): string {
  return date.replaceAll('-', '');
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

function formatUtcStamp(date: Date): string {
  return date
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}Z$/, 'Z');
}

function escapeText(value: string): string {
  return value
    .replaceAll('\\', '\\\\')
    .replaceAll(';', '\\;')
    .replaceAll(',', '\\,')
    .replaceAll('\r\n', '\\n')
    .replaceAll('\n', '\\n');
}

function foldLine(line: string): string {
  const encoder = new TextEncoder();
  if (encoder.encode(line).length <= LINE_LIMIT_OCTETS) {
    return line;
  }
  const parts: string[] = [];
  let current = '';
  let currentOctets = 0;
  let limit = LINE_LIMIT_OCTETS;
  for (const character of line) {
    const octets = encoder.encode(character).length;
    if (currentOctets + octets > limit) {
      parts.push(current);
      current = '';
      currentOctets = 0;
      limit = LINE_LIMIT_OCTETS - 1;
    }
    current += character;
    currentOctets += octets;
  }
  parts.push(current);
  return parts.join(`${CRLF} `);
}
