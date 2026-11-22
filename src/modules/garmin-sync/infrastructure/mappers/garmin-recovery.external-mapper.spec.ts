import {
  GarminRecoveryExternalMapper,
  enumerateDays,
} from './garmin-recovery.external-mapper.js';

const RANGE = { from: '2026-11-01', to: '2026-11-03' };

describe('GarminRecoveryExternalMapper', () => {
  describe('enumerateDays', () => {
    it('énumère les dates incluses de la plage, dans l’ordre', () => {
      expect(enumerateDays('2026-02-27', '2026-03-01')).toEqual([
        '2026-02-27',
        '2026-02-28',
        '2026-03-01',
      ]);
    });
  });

  describe('combine', () => {
    it('regroupe les indicateurs de chaque jour et laisse null ce qui manque', () => {
      const days = GarminRecoveryExternalMapper.combine(RANGE, {
        sleep: [{ calendarDate: '2026-11-02', sleepTimeSeconds: 27000 }],
        hrv: {
          hrvSummaries: [
            { calendarDate: '2026-11-02', lastNightAvg: 48, weeklyAvg: 50 },
          ],
        },
        bodyBattery: [{ date: '2026-11-02', charged: 85, drained: 40 }],
        restingHeartRateByDate: new Map([
          ['2026-11-02', { calendarDate: '2026-11-02', restingHeartRate: 52 }],
        ]),
      });

      expect(days).toEqual([
        {
          date: '2026-11-01',
          sleepSeconds: null,
          hrvLastNightAvg: null,
          hrvWeeklyAvg: null,
          bodyBatteryCharged: null,
          bodyBatteryDrained: null,
          restingHeartRate: null,
        },
        {
          date: '2026-11-02',
          sleepSeconds: 27000,
          hrvLastNightAvg: 48,
          hrvWeeklyAvg: 50,
          bodyBatteryCharged: 85,
          bodyBatteryDrained: 40,
          restingHeartRate: 52,
        },
        {
          date: '2026-11-03',
          sleepSeconds: null,
          hrvLastNightAvg: null,
          hrvWeeklyAvg: null,
          bodyBatteryCharged: null,
          bodyBatteryDrained: null,
          restingHeartRate: null,
        },
      ]);
    });

    it('traite un 204 (corps vide) comme absence de donnée, jamais comme erreur', () => {
      const days = GarminRecoveryExternalMapper.combine(RANGE, {
        sleep: '',
        hrv: '',
        bodyBattery: '',
        restingHeartRateByDate: new Map([['2026-11-01', '']]),
      });

      expect(days).toHaveLength(3);
      for (const day of days) {
        expect(day.sleepSeconds).toBeNull();
        expect(day.hrvLastNightAvg).toBeNull();
        expect(day.bodyBatteryCharged).toBeNull();
        expect(day.restingHeartRate).toBeNull();
      }
    });

    it('ne compte jamais une valeur absente comme zéro', () => {
      const days = GarminRecoveryExternalMapper.combine(
        { from: '2026-11-01', to: '2026-11-01' },
        {
          sleep: [{ calendarDate: '2026-11-01' }],
          hrv: { hrvSummaries: [{ calendarDate: '2026-11-01' }] },
          bodyBattery: [{ date: '2026-11-01', charged: null }],
          restingHeartRateByDate: new Map(),
        },
      );

      expect(days[0]).toMatchObject({
        sleepSeconds: null,
        hrvLastNightAvg: null,
        bodyBatteryCharged: null,
        restingHeartRate: null,
      });
    });

    it('ignore un élément mal formé sans perdre les autres jours', () => {
      const days = GarminRecoveryExternalMapper.combine(RANGE, {
        sleep: [
          { calendarDate: '2026-11-01', sleepTimeSeconds: 'inconnu' },
          { calendarDate: '2026-11-03', sleepTimeSeconds: 25200 },
        ],
        hrv: 'format inattendu',
        bodyBattery: [],
        restingHeartRateByDate: new Map(),
      });

      expect(days[0].sleepSeconds).toBeNull();
      expect(days[2].sleepSeconds).toBe(25200);
      expect(days[1].hrvLastNightAvg).toBeNull();
    });
  });
});
