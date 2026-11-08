import {
  type ReconciliationActivity,
  type ReconciliationSession,
  reconcileSessionsWithActivities,
} from './activity-reconciliation.js';

const DAY = '2026-11-12';
const NO_LINKS: ReadonlySet<string> = new Set();

function seance(
  id: string,
  overrides: Partial<ReconciliationSession> = {},
): ReconciliationSession {
  return {
    id,
    date: DAY,
    disciplineTypeKey: 'running',
    status: 'planifiee',
    activityId: null,
    ...overrides,
  };
}

function activite(
  id: string,
  overrides: Partial<ReconciliationActivity> = {},
): ReconciliationActivity {
  return { id, type: 'running', localDate: DAY, ...overrides };
}

describe('reconcileSessionsWithActivities', () => {
  it('rapproche une séance unique et une activité unique de même jour et discipline', () => {
    expect(
      reconcileSessionsWithActivities(
        [seance('s1')],
        [activite('a1')],
        NO_LINKS,
      ),
    ).toEqual([{ sessionId: 's1', activityId: 'a1' }]);
  });

  it('ne rapproche rien quand deux activités de même jour et discipline se disputent la séance', () => {
    expect(
      reconcileSessionsWithActivities(
        [seance('s1')],
        [activite('a1'), activite('a2')],
        NO_LINKS,
      ),
    ).toEqual([]);
  });

  it('ne rapproche rien quand deux séances de même jour et discipline attendent la même activité', () => {
    expect(
      reconcileSessionsWithActivities(
        [seance('s1'), seance('s2')],
        [activite('a1')],
        NO_LINKS,
      ),
    ).toEqual([]);
  });

  it('ignore une activité d’une autre discipline ou d’un autre jour', () => {
    expect(
      reconcileSessionsWithActivities(
        [seance('s1')],
        [
          activite('a1', { type: 'cycling' }),
          activite('a2', { localDate: '2026-11-13' }),
        ],
        NO_LINKS,
      ),
    ).toEqual([]);
  });

  it.each([
    ['réalisée', { status: 'realisee' }],
    ['manquée', { status: 'manquee' }],
    ['déjà liée', { activityId: 'autre' }],
  ])('n’utilise pas une séance %s', (_label, overrides) => {
    expect(
      reconcileSessionsWithActivities(
        [seance('s1', overrides)],
        [activite('a1')],
        NO_LINKS,
      ),
    ).toEqual([]);
  });

  it('n’utilise pas une activité déjà liée à une séance', () => {
    expect(
      reconcileSessionsWithActivities(
        [seance('s1')],
        [activite('a1')],
        new Set(['a1']),
      ),
    ).toEqual([]);
  });

  it('trie les couples par identifiant de séance', () => {
    const result = reconcileSessionsWithActivities(
      [seance('s2', { date: '2026-11-13' }), seance('s1')],
      [activite('a2', { localDate: '2026-11-13' }), activite('a1')],
      NO_LINKS,
    );

    expect(result.map((pair) => pair.sessionId)).toEqual(['s1', 's2']);
  });
});
