import { SyncWindow } from './sync-window.vo.js';

const DAY_MS = 24 * 60 * 60 * 1000;

describe('SyncWindow', () => {
  it('reprend sept jours avant la dernière activité connue', () => {
    const latest = new Date('2026-05-20T10:30:00.000Z');

    const window = SyncWindow.resumingFrom(latest);

    expect(window.since).toEqual(new Date(latest.getTime() - 7 * DAY_MS));
    expect(window.since?.toISOString()).toBe('2026-05-13T10:30:00.000Z');
  });

  it("n'a pas de borne de début quand aucune activité n'est connue", () => {
    expect(SyncWindow.resumingFrom(null).since).toBeNull();
  });

  it('ne modifie pas la date fournie', () => {
    const latest = new Date('2026-05-20T10:30:00.000Z');

    SyncWindow.resumingFrom(latest);

    expect(latest.toISOString()).toBe('2026-05-20T10:30:00.000Z');
  });

  it('traverse un changement de mois', () => {
    const window = SyncWindow.resumingFrom(
      new Date('2026-03-03T00:00:00.000Z'),
    );

    expect(window.since?.toISOString()).toBe('2026-02-24T00:00:00.000Z');
  });
});
