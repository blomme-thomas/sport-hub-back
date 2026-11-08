import ICAL from 'ical.js';
import { describe, expect, it } from 'vitest';
import { serializeIcsCalendar } from './ics-calendar.serializer.js';

const STAMP = new Date('2026-11-09T10:00:00.000Z');

function timedEvent(ics: string) {
  const root = new ICAL.Component(ICAL.parse(ics));
  const event = root.getFirstSubcomponent('vevent');
  if (event === null) {
    throw new Error('aucun VEVENT');
  }
  const start = event.getFirstPropertyValue('dtstart') as ICAL.Time;
  const end = event.getFirstPropertyValue('dtend') as ICAL.Time;
  return {
    start: start.toString(),
    end: end.toString(),
    startIsDate: start.isDate,
  };
}

describe('serializeIcsCalendar avec heure de début', () => {
  it('horodate le début et la fin en Europe/Paris', () => {
    const ics = serializeIcsCalendar(
      [
        {
          uid: 't@sport-hub',
          date: '2026-11-12',
          summary: 'swimming - 75 min',
          start: { time: '18:00', durationMinutes: 75 },
        },
      ],
      STAMP,
    );

    expect(ics).toContain('DTSTART;TZID=Europe/Paris:20261112T180000');
    expect(ics).toContain('DTEND;TZID=Europe/Paris:20261112T191500');
    expect(ics).toContain('BEGIN:VTIMEZONE');
    expect(timedEvent(ics)).toEqual({
      start: '2026-11-12T18:00:00',
      end: '2026-11-12T19:15:00',
      startIsDate: false,
    });
  });

  it('reporte la fin au jour suivant quand la séance dépasse minuit', () => {
    const ics = serializeIcsCalendar(
      [
        {
          uid: 'n@sport-hub',
          date: '2026-12-31',
          summary: 'running - 60 min',
          start: { time: '23:30', durationMinutes: 60 },
        },
      ],
      STAMP,
    );

    expect(ics).toContain('DTEND;TZID=Europe/Paris:20270101T003000');
  });

  it('garde l’événement journée entière sans heure de début', () => {
    const ics = serializeIcsCalendar(
      [{ uid: 'j@sport-hub', date: '2026-11-12', summary: 'x' }],
      STAMP,
    );

    expect(ics).toContain('DTSTART;VALUE=DATE:20261112');
    expect(ics).not.toContain('DTEND');
  });
});
