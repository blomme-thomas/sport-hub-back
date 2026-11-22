import { SESSION_STATUSES, isSessionStatus } from './session-status.vo.js';

describe('SessionStatus', () => {
  it('liste les trois statuts autorisés', () => {
    expect([...SESSION_STATUSES]).toEqual(['planifiee', 'realisee', 'manquee']);
  });

  it.each(['planifiee', 'realisee', 'manquee'])(
    'reconnaît %s comme un statut de séance',
    (value) => {
      expect(isSessionStatus(value)).toBe(true);
    },
  );

  it.each([
    ['statut inconnu', 'annulee'],
    ['chaîne vide', ''],
    ['casse différente', 'Realisee'],
    ['valeur nulle', null],
    ['valeur absente', undefined],
  ])('rejette %s', (_label, value) => {
    expect(isSessionStatus(value)).toBe(false);
  });
});
