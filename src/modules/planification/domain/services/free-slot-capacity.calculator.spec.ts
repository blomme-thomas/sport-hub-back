import {
  computeFreeSlotCapacity,
  type SessionSnapshot,
  type SlotOccurrenceSnapshot,
} from './free-slot-capacity.calculator.js';

const TODAY = '2026-11-10';
const DAY = '2026-11-12';

function libre(
  slotId: string,
  startTime: string,
  endTime: string,
  date = DAY,
): SlotOccurrenceSnapshot {
  return { slotId, type: 'libre', date, startTime, endTime };
}

function occupe(
  slotId: string,
  startTime: string,
  endTime: string,
  date = DAY,
): SlotOccurrenceSnapshot {
  return { slotId, type: 'occupe', date, startTime, endTime };
}

function session(
  durationMinutes: number,
  overrides: Partial<SessionSnapshot> = {},
  date = DAY,
): SessionSnapshot {
  return {
    date,
    durationMinutes,
    status: 'planifiee',
    modifiedManually: false,
    ...overrides,
  };
}

function availableOf(
  result: ReturnType<typeof computeFreeSlotCapacity>,
  slotId: string,
): number | undefined {
  return result.find((slot) => slot.slotId === slotId)?.availableMinutes;
}

describe('computeFreeSlotCapacity', () => {
  it('renvoie la durée entière d’un créneau libre sans occupation ni séance', () => {
    const result = computeFreeSlotCapacity({
      today: TODAY,
      occurrences: [libre('a', '18:00', '20:00')],
      sessions: [],
    });

    expect(result).toEqual([
      {
        slotId: 'a',
        date: DAY,
        startTime: '18:00',
        endTime: '20:00',
        availableMinutes: 120,
      },
    ]);
  });

  it('retire la durée d’une séance fixe du créneau libre du même jour', () => {
    const result = computeFreeSlotCapacity({
      today: TODAY,
      occurrences: [libre('a', '18:00', '20:00')],
      sessions: [session(60, { status: 'realisee' })],
    });

    expect(availableOf(result, 'a')).toBe(60);
  });

  it('ignore une séance planifiée non modifiée manuellement', () => {
    const result = computeFreeSlotCapacity({
      today: TODAY,
      occurrences: [libre('a', '18:00', '20:00')],
      sessions: [session(60)],
    });

    expect(availableOf(result, 'a')).toBe(120);
  });

  it.each([
    ['réalisée', { status: 'realisee' }],
    ['manquée', { status: 'manquee' }],
    ['modifiée manuellement', { modifiedManually: true }],
  ])('compte une séance %s comme contrainte fixe', (_label, overrides) => {
    const result = computeFreeSlotCapacity({
      today: TODAY,
      occurrences: [libre('a', '18:00', '20:00')],
      sessions: [session(60, overrides)],
    });

    expect(availableOf(result, 'a')).toBe(60);
  });

  it('retire le temps d’un créneau occupé qui chevauche le créneau libre', () => {
    const result = computeFreeSlotCapacity({
      today: TODAY,
      occurrences: [
        libre('a', '18:00', '20:00'),
        occupe('o', '19:00', '21:00'),
      ],
      sessions: [],
    });

    expect(availableOf(result, 'a')).toBe(60);
  });

  it('ne compte qu’une fois une minute couverte par deux créneaux occupés qui se chevauchent', () => {
    const result = computeFreeSlotCapacity({
      today: TODAY,
      occurrences: [
        libre('a', '18:00', '20:00'),
        occupe('o1', '18:30', '19:30'),
        occupe('o2', '19:00', '19:45'),
      ],
      sessions: [],
    });

    expect(availableOf(result, 'a')).toBe(45);
  });

  it('laisse intact un créneau libre seulement adjacent à un créneau occupé', () => {
    const result = computeFreeSlotCapacity({
      today: TODAY,
      occurrences: [
        libre('a', '18:00', '19:00'),
        occupe('o', '19:00', '20:00'),
      ],
      sessions: [],
    });

    expect(availableOf(result, 'a')).toBe(60);
  });

  it('ne renvoie jamais un créneau occupé', () => {
    const result = computeFreeSlotCapacity({
      today: TODAY,
      occurrences: [occupe('o', '18:00', '20:00')],
      sessions: [],
    });

    expect(result).toEqual([]);
  });

  it('ne propose pas les créneaux libres dont la date est passée et garde ceux du jour même', () => {
    const result = computeFreeSlotCapacity({
      today: TODAY,
      occurrences: [
        libre('veille', '18:00', '20:00', '2026-11-09'),
        libre('jour', '18:00', '19:00', TODAY),
      ],
      sessions: [],
    });

    expect(result.map((slot) => slot.slotId)).toEqual(['jour']);
  });

  it('répartit les séances fixes entre les créneaux du jour dans l’ordre de début', () => {
    const result = computeFreeSlotCapacity({
      today: TODAY,
      occurrences: [
        libre('tard', '20:00', '21:00'),
        libre('tot', '18:00', '19:00'),
      ],
      sessions: [session(90, { status: 'realisee' })],
    });

    expect(result.map((slot) => [slot.slotId, slot.availableMinutes])).toEqual([
      ['tot', 0],
      ['tard', 30],
    ]);
  });

  it('plafonne à zéro quand les séances fixes dépassent la capacité', () => {
    const result = computeFreeSlotCapacity({
      today: TODAY,
      occurrences: [libre('a', '18:00', '19:00')],
      sessions: [session(300, { status: 'realisee' })],
    });

    expect(availableOf(result, 'a')).toBe(0);
  });

  it('ne consomme pas la capacité d’un autre jour', () => {
    const result = computeFreeSlotCapacity({
      today: TODAY,
      occurrences: [libre('a', '18:00', '19:00', DAY)],
      sessions: [session(60, { status: 'manquee' }, '2026-11-13')],
    });

    expect(availableOf(result, 'a')).toBe(60);
  });

  it('renvoie une liste vide sans créneau', () => {
    expect(
      computeFreeSlotCapacity({
        today: TODAY,
        occurrences: [],
        sessions: [session(60, { status: 'realisee' })],
      }),
    ).toEqual([]);
  });

  it('rejette une occurrence dont la fin n’est pas après le début', () => {
    expect(() =>
      computeFreeSlotCapacity({
        today: TODAY,
        occurrences: [libre('a', '20:00', '20:00')],
        sessions: [],
      }),
    ).toThrow('la fin doit être après le début');
  });
});
