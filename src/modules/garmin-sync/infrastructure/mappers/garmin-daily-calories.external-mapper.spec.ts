import { GarminUnavailableError } from '../../domain/errors/garmin-unavailable.error.js';
import { GarminDailyCaloriesExternalMapper } from './garmin-daily-calories.external-mapper.js';

const RANGE = { from: '2026-11-01', to: '2026-11-03' };

function summary(calendarDate: string, burnedTotal: unknown) {
  return {
    calendarDate,
    calories: { burnedResting: 1800, burnedActive: 550, burnedTotal },
  };
}

describe('GarminDailyCaloriesExternalMapper', () => {
  describe('combine', () => {
    it('renvoie un jour par date de la plage, dans l’ordre, y compris les jours sans séance', () => {
      const days = GarminDailyCaloriesExternalMapper.combine(RANGE, {
        data: [summary('2026-11-02', 2350)],
      });

      expect(days).toEqual([
        { date: '2026-11-01', calories: null },
        { date: '2026-11-02', calories: 2350 },
        { date: '2026-11-03', calories: null },
      ]);
    });

    it('lit burnedTotal, repos inclus, et non burnedActive ni burnedResting', () => {
      const [day] = GarminDailyCaloriesExternalMapper.combine(
        { from: '2026-11-02', to: '2026-11-02' },
        {
          data: [
            {
              calendarDate: '2026-11-02',
              calories: {
                burnedResting: 1800,
                burnedActive: 550,
                burnedTotal: 2350,
              },
            },
          ],
        },
      );

      expect(day?.calories).toBe(2350);
    });

    it('garde une valeur réelle de zéro comme zéro', () => {
      const [day] = GarminDailyCaloriesExternalMapper.combine(
        { from: '2026-11-02', to: '2026-11-02' },
        { data: [summary('2026-11-02', 0)] },
      );

      expect(day?.calories).toBe(0);
    });

    it.each([
      ['une chaîne vide', ''],
      ['un corps absent', undefined],
      ['un corps null', null],
    ])(
      'traite %s (204 Garmin) comme absence de donnée, jamais comme erreur',
      (_label, body) => {
        const days = GarminDailyCaloriesExternalMapper.combine(RANGE, body);

        expect(days).toEqual([
          { date: '2026-11-01', calories: null },
          { date: '2026-11-02', calories: null },
          { date: '2026-11-03', calories: null },
        ]);
      },
    );

    it.each([
      ['sans burnedTotal', { burnedResting: 1800, burnedActive: 550 }],
      ['avec un burnedTotal null', { burnedTotal: null }],
      ['avec un bloc calories null', null],
    ])(
      'laisse null un jour dont le calories est %s, sans perdre les autres jours',
      (_label, calories) => {
        const days = GarminDailyCaloriesExternalMapper.combine(RANGE, {
          data: [
            { calendarDate: '2026-11-01', calories },
            summary('2026-11-03', 2100),
          ],
        });

        expect(days[0]?.calories).toBeNull();
        expect(days[1]?.calories).toBeNull();
        expect(days[2]?.calories).toBe(2100);
      },
    );

    it('ne compte jamais une journée sans bloc calories comme zéro', () => {
      const days = GarminDailyCaloriesExternalMapper.combine(
        { from: '2026-11-01', to: '2026-11-01' },
        { data: [{ calendarDate: '2026-11-01' }] },
      );

      expect(days[0]?.calories).toBeNull();
    });

    it.each([
      ['un tableau sans enveloppe', [summary('2026-11-02', 2350)]],
      ['un objet sans data', { other: [summary('2026-11-02', 2350)] }],
      ['une chaîne non JSON', 'pas du json'],
      ['un data qui n est pas un tableau', { data: 'inattendu' }],
    ])(
      'lève GarminUnavailableError sur une enveloppe invalide (%s)',
      (_label, body) => {
        expect(() =>
          GarminDailyCaloriesExternalMapper.combine(RANGE, body),
        ).toThrow(GarminUnavailableError);
      },
    );

    it.each([
      ['un élément texte', 'texte'],
      ['un élément null', null],
      ['un élément sans calendarDate', { calories: { burnedTotal: 1500 } }],
      ['un burnedTotal textuel', summary('2026-11-02', 'abc')],
    ])(
      'lève GarminUnavailableError sur un élément invalide (%s), sans masquer le changement de format',
      (_label, item) => {
        expect(() =>
          GarminDailyCaloriesExternalMapper.combine(RANGE, {
            data: [summary('2026-11-01', 1900), item],
          }),
        ).toThrow(GarminUnavailableError);
      },
    );

    it('ignore les éléments hors de la plage demandée', () => {
      const days = GarminDailyCaloriesExternalMapper.combine(RANGE, {
        data: [summary('2026-10-31', 1900), summary('2026-11-04', 2000)],
      });

      expect(days).toHaveLength(3);
      expect(days.every((day) => day.calories === null)).toBe(true);
    });
  });
});
