import { Injectable } from '@nestjs/common';
import { GetDailyCaloriesUseCase } from '../../../garmin-sync/index.js';
import {
  type DailyCalories,
  type DailyCaloriesWindow,
  type IDailyCaloriesProvider,
} from '../../domain/ports/outbound/daily-calories.provider.port.js';

const DAY_MS = 24 * 60 * 60 * 1000;

function toDateOnly(time: number): string {
  return new Date(time).toISOString().slice(0, 10);
}

@Injectable()
export class GarminDailyCaloriesAdapter implements IDailyCaloriesProvider {
  constructor(private readonly dailyCalories: GetDailyCaloriesUseCase) {}

  async findDailyCalories(
    window: DailyCaloriesWindow,
  ): Promise<DailyCalories[]> {
    const days = await this.dailyCalories.execute({
      from: toDateOnly(window.from.getTime()),
      to: toDateOnly(window.toExclusive.getTime() - DAY_MS),
    });
    return days.map((day) => ({ date: day.date, calories: day.calories }));
  }
}
