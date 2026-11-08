import { describe, expect, it, vi } from 'vitest';
import type {
  CalendarSession,
  ICalendarSessionsReader,
} from '../../domain/ports/outbound/calendar.ports.js';
import { ExportPlannedCalendarUseCase } from './export-planned-calendar.use-case.js';

const NOW = new Date('2026-11-09T10:00:00.000Z');

function session(overrides: Partial<CalendarSession>): CalendarSession {
  return {
    id: 'id-1',
    date: '2026-11-12',
    disciplineTypeKey: 'swimming',
    durationMinutes: 45,
    status: 'planifiee',
    ...overrides,
  };
}

function build(sessions: CalendarSession[]) {
  const reader: ICalendarSessionsReader = {
    sessionsIn: vi.fn().mockResolvedValue(sessions),
  };
  return {
    reader,
    useCase: new ExportPlannedCalendarUseCase(reader, () => NOW),
  };
}

describe('ExportPlannedCalendarUseCase', () => {
  it('lit les séances de la période', async () => {
    const { reader, useCase } = build([]);

    await useCase.execute({ from: '2026-11-01', to: '2026-11-30' });

    expect(reader.sessionsIn).toHaveBeenCalledWith('2026-11-01', '2026-11-30');
  });

  it('n’exporte que les séances planifiées', async () => {
    const { useCase } = build([
      session({ id: 'a', status: 'planifiee' }),
      session({ id: 'b', status: 'realisee' }),
      session({ id: 'c', status: 'manquee' }),
    ]);

    const ics = await useCase.execute({ from: '2026-11-01', to: '2026-11-30' });

    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(1);
    expect(ics).toContain('UID:a@sport-hub');
  });

  it('décrit chaque séance par sa discipline et sa durée', async () => {
    const { useCase } = build([session({ durationMinutes: 60 })]);

    const ics = await useCase.execute({ from: '2026-11-01', to: '2026-11-30' });

    expect(ics).toContain('SUMMARY:swimming - 60 min');
    expect(ics).toContain('DTSTART;VALUE=DATE:20261112');
  });
});
