import { DayInterval } from './day-interval.vo.js';

function interval(
  startTime: string,
  endTime: string,
  date = '2026-11-12',
): DayInterval {
  return DayInterval.create({ date, startTime, endTime });
}

describe('DayInterval', () => {
  it('calcule la durée en minutes', () => {
    expect(interval('18:00', '19:30').durationMinutes).toBe(90);
  });

  it.each([
    [
      'date mal formée',
      { date: '12/11/2026', startTime: '18:00', endTime: '19:00' },
    ],
    [
      'heure mal formée',
      { date: '2026-11-12', startTime: '6:00', endTime: '19:00' },
    ],
    [
      'fin égale au début',
      { date: '2026-11-12', startTime: '18:00', endTime: '18:00' },
    ],
    [
      'fin avant le début',
      { date: '2026-11-12', startTime: '19:00', endTime: '18:00' },
    ],
  ])('rejette %s', (_label, props) => {
    expect(() => DayInterval.create(props)).toThrow();
  });

  it('compte les minutes couvertes par des intervalles d’un autre jour pour zéro', () => {
    const slot = interval('18:00', '20:00');

    expect(
      slot.coveredMinutesBy([interval('18:00', '20:00', '2026-11-13')]),
    ).toBe(0);
  });

  it('compte une minute couverte une seule fois, même par des intervalles qui se chevauchent', () => {
    const slot = interval('18:00', '20:00');

    expect(
      slot.coveredMinutesBy([
        interval('18:00', '19:00'),
        interval('18:30', '19:30'),
      ]),
    ).toBe(90);
  });

  it('ne compte que la part de l’intervalle située dans le créneau', () => {
    const slot = interval('18:00', '20:00');

    expect(slot.coveredMinutesBy([interval('17:00', '18:30')])).toBe(30);
  });
});
