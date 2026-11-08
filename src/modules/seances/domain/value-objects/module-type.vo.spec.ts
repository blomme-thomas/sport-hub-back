import { MODULE_TYPES, isModuleType } from './module-type.vo.js';

describe('ModuleType', () => {
  it('liste les cinq types de module autorisés', () => {
    expect([...MODULE_TYPES]).toEqual([
      'echauffement',
      'educatifs',
      'series',
      'retour_au_calme',
      'autre',
    ]);
  });

  it.each(['echauffement', 'educatifs', 'series', 'retour_au_calme', 'autre'])(
    'reconnaît %s comme un type de module',
    (value) => {
      expect(isModuleType(value)).toBe(true);
    },
  );

  it.each([
    ['type inconnu', 'natation'],
    ['chaîne vide', ''],
    ['casse différente', 'Series'],
    ['valeur nulle', null],
    ['valeur absente', undefined],
  ])('rejette %s', (_label, value) => {
    expect(isModuleType(value)).toBe(false);
  });
});
