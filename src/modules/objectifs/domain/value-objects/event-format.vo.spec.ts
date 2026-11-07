import { EVENT_FORMATS, isEventFormat } from './event-format.vo.js';

describe('EventFormat', () => {
  it('liste les formats d’événement autorisés', () => {
    expect([...EVENT_FORMATS]).toEqual([
      'sprint',
      'olympique',
      'half',
      'full',
      'autre',
    ]);
  });

  it.each(['sprint', 'olympique', 'half', 'full', 'autre'])(
    'reconnaît %s comme un format d’événement',
    (value) => {
      expect(isEventFormat(value)).toBe(true);
    },
  );

  it.each([
    ['format inconnu', 'marathon'],
    ['chaîne vide', ''],
    ['casse différente', 'Half'],
    ['valeur nulle', null],
    ['valeur absente', undefined],
  ])('rejette %s', (_label, value) => {
    expect(isEventFormat(value)).toBe(false);
  });
});
