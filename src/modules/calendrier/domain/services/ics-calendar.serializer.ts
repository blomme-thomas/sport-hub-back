const LINE_LIMIT_OCTETS = 75;
const CRLF = '\r\n';

export interface IcsEvent {
  uid: string;
  date: string;
  summary: string;
}

/**
 * Produit un calendrier ICS (RFC 5545) : un événement journée entière par entrée, sans heure de début inventée.
 * Les textes sont échappés, et les lignes sont repliées à 75 octets.
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
    ...events.flatMap((event) => [
      'BEGIN:VEVENT',
      `UID:${escapeText(event.uid)}`,
      `DTSTAMP:${dtstamp}`,
      `DTSTART;VALUE=DATE:${event.date.replaceAll('-', '')}`,
      `SUMMARY:${escapeText(event.summary)}`,
      'TRANSP:TRANSPARENT',
      'END:VEVENT',
    ]),
    'END:VCALENDAR',
  ];
  return lines.map(foldLine).join(CRLF) + CRLF;
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
