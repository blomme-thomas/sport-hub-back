import type {
  DailyCaloriesDay,
  GetDailyCaloriesUseCase,
} from '../../../garmin-sync/index.js';
import { GarminDailyCaloriesAdapter } from './garmin-daily-calories.adapter.js';

describe('GarminDailyCaloriesAdapter', () => {
  let execute: ReturnType<typeof vi.fn>;

  function adapter() {
    const useCase = { execute } as unknown as GetDailyCaloriesUseCase;
    return new GarminDailyCaloriesAdapter(useCase);
  }

  beforeEach(() => {
    execute = vi.fn().mockResolvedValue([]);
  });

  describe('fenêtre de lecture', () => {
    it('convertit la fenêtre [from, toExclusive) en plage incluse YYYY-MM-DD', async () => {
      await adapter().findDailyCalories({
        from: new Date('2026-11-07T00:00:00.000Z'),
        toExclusive: new Date('2026-11-09T00:00:00.000Z'),
      });

      expect(execute).toHaveBeenCalledWith({
        from: '2026-11-07',
        to: '2026-11-08',
      });
    });

    it('exclut la borne toExclusive : une fenêtre d un jour a from égal à to', async () => {
      await adapter().findDailyCalories({
        from: new Date('2026-11-07T00:00:00.000Z'),
        toExclusive: new Date('2026-11-08T00:00:00.000Z'),
      });

      expect(execute).toHaveBeenCalledWith({
        from: '2026-11-07',
        to: '2026-11-07',
      });
    });

    it('couvre une année glissante sans inclure le jour de toExclusive', async () => {
      await adapter().findDailyCalories({
        from: new Date('2025-11-09T00:00:00.000Z'),
        toExclusive: new Date('2026-11-09T00:00:00.000Z'),
      });

      expect(execute).toHaveBeenCalledWith({
        from: '2025-11-09',
        to: '2026-11-08',
      });
    });

    it('interroge le use case une seule fois par appel', async () => {
      await adapter().findDailyCalories({
        from: new Date('2026-11-07T00:00:00.000Z'),
        toExclusive: new Date('2026-11-09T00:00:00.000Z'),
      });

      expect(execute).toHaveBeenCalledTimes(1);
    });
  });

  describe('mapping vers le contexte training-stats', () => {
    it('renvoie une entrée par jour avec la date et les calories, null compris', async () => {
      const days: DailyCaloriesDay[] = [
        { date: '2026-11-07', calories: 2350 },
        { date: '2026-11-08', calories: null },
      ];
      execute.mockResolvedValue(days);

      const result = await adapter().findDailyCalories({
        from: new Date('2026-11-07T00:00:00.000Z'),
        toExclusive: new Date('2026-11-09T00:00:00.000Z'),
      });

      expect(result).toEqual([
        { date: '2026-11-07', calories: 2350 },
        { date: '2026-11-08', calories: null },
      ]);
    });

    it('ne transforme pas une calorie absente en zéro', async () => {
      execute.mockResolvedValue([{ date: '2026-11-07', calories: null }]);

      const [day] = await adapter().findDailyCalories({
        from: new Date('2026-11-07T00:00:00.000Z'),
        toExclusive: new Date('2026-11-08T00:00:00.000Z'),
      });

      expect(day?.calories).toBeNull();
    });

    it('conserve l ordre chronologique renvoyé par le use case', async () => {
      execute.mockResolvedValue([
        { date: '2026-11-07', calories: 2000 },
        { date: '2026-11-08', calories: 2100 },
        { date: '2026-11-09', calories: null },
      ]);

      const result = await adapter().findDailyCalories({
        from: new Date('2026-11-07T00:00:00.000Z'),
        toExclusive: new Date('2026-11-10T00:00:00.000Z'),
      });

      expect(result.map((day) => day.date)).toEqual([
        '2026-11-07',
        '2026-11-08',
        '2026-11-09',
      ]);
    });
  });

  describe('erreurs', () => {
    it('propage l erreur du use case sans la transformer ni la remplacer par des activités', async () => {
      const failure = new Error('Garmin indisponible');
      execute.mockRejectedValue(failure);

      await expect(
        adapter().findDailyCalories({
          from: new Date('2026-11-07T00:00:00.000Z'),
          toExclusive: new Date('2026-11-08T00:00:00.000Z'),
        }),
      ).rejects.toBe(failure);
    });
  });
});
