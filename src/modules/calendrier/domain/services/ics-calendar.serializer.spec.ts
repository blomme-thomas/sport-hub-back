import ICAL from 'ical.js';
import { describe, expect, it } from 'vitest';
import { serializeIcsCalendar } from './ics-calendar.serializer.js';

const STAMP = new Date('2026-11-09T10:00:00.000Z');

function parse(ics: string) {
  const root = new ICAL.Component(ICAL.parse(ics));
  return root.getAllSubcomponents('vevent').map((event) => {
    const start = event.getFirstPropertyValue('dtstart') as ICAL.Time;
    return {
      uid: event.getFirstPropertyValue('uid') as string,
      summary: event.getFirstPropertyValue('summary') as string,
      start: start.toString(),
      startIsDate: start.isDate,
    };
  });
}

describe('serializeIcsCalendar', () => {
  it('produit un calendrier parsable avec une entrée par événement', () => {
    const ics = serializeIcsCalendar(
      [
        {
          uid: 'a@sport-hub',
          date: '2026-11-12',
          summary: 'swimming - 45 min',
        },
        { uid: 'b@sport-hub', date: '2026-11-14', summary: 'running - 60 min' },
      ],
      STAMP,
    );

    expect(parse(ics)).toEqual([
      {
        uid: 'a@sport-hub',
        summary: 'swimming - 45 min',
        start: '2026-11-12',
        startIsDate: true,
      },
      {
        uid: 'b@sport-hub',
        summary: 'running - 60 min',
        start: '2026-11-14',
        startIsDate: true,
      },
    ]);
  });

  it('produit un calendrier valide sans événement', () => {
    const ics = serializeIcsCalendar([], STAMP);

    expect(ics.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true);
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true);
    expect(parse(ics)).toEqual([]);
  });

  it('échappe les virgules, points-virgules et retours à la ligne', () => {
    const ics = serializeIcsCalendar(
      [{ uid: 'c@sport-hub', date: '2026-11-12', summary: 'a, b; c\nd' }],
      STAMP,
    );

    expect(parse(ics)[0]?.summary).toBe('a, b; c\nd');
  });

  it('replie les lignes longues à 75 octets sans couper un caractère multi-octets', () => {
    const summary = 'é'.repeat(60);
    const ics = serializeIcsCalendar(
      [{ uid: 'd@sport-hub', date: '2026-11-12', summary }],
      STAMP,
    );

    for (const line of ics.split('\r\n')) {
      expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
    }
    expect(parse(ics)[0]?.summary).toBe(summary);
  });

  it('horodate DTSTAMP en UTC', () => {
    const ics = serializeIcsCalendar([], STAMP);

    expect(ics).toContain('\r\n');
    expect(ics.split('\r\n').some((line) => line === 'METHOD:PUBLISH')).toBe(
      true,
    );
    const event = serializeIcsCalendar(
      [{ uid: 'e@sport-hub', date: '2026-11-12', summary: 'x' }],
      STAMP,
    );
    expect(event).toContain('DTSTAMP:20261109T100000Z');
  });
});
