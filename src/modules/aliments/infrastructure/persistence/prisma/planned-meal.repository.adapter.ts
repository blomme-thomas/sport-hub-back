import { Injectable } from '@nestjs/common';
import type { PlannedMeal } from '../../../domain/entities/planned-meal.entity.js';
import type { IPlannedMealRepository } from '../../../domain/ports/outbound/planned-meal.repository.port.js';
import { MealDate } from '../../../domain/value-objects/meal-date.vo.js';
import type { PlannedMealId } from '../../../domain/value-objects/planned-meal-id.vo.js';
import type { RecipeId } from '../../../domain/value-objects/recipe-id.vo.js';
import { PrismaService } from '../../../../../core/prisma/prisma.service.js';
import { PlannedMealMapper } from './planned-meal.mapper.js';

@Injectable()
export class PrismaPlannedMealRepositoryAdapter implements IPlannedMealRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findBetween(start: MealDate, end: MealDate): Promise<PlannedMeal[]> {
    const records = await this.prisma.plannedMeal.findMany({
      where: {
        date: {
          gte: new Date(`${start.toString()}T00:00:00Z`),
          lte: new Date(`${end.toString()}T00:00:00Z`),
        },
      },
      orderBy: [{ date: 'asc' }, { mealTag: 'asc' }],
    });
    return records.map((record) => PlannedMealMapper.toDomain(record));
  }

  async findById(id: PlannedMealId): Promise<PlannedMeal | null> {
    const record = await this.prisma.plannedMeal.findUnique({
      where: { id: id.toString() },
    });
    return record === null ? null : PlannedMealMapper.toDomain(record);
  }

  async countByRecipe(recipeId: RecipeId): Promise<number> {
    return this.prisma.plannedMeal.count({
      where: { recipeId: recipeId.toString() },
    });
  }

  async save(plannedMeal: PlannedMeal): Promise<void> {
    const data = PlannedMealMapper.toPersistence(plannedMeal);
    await this.prisma.plannedMeal.upsert({
      where: { id: data.id },
      create: data,
      update: { ...data, id: undefined },
    });
  }

  async delete(id: PlannedMealId): Promise<void> {
    await this.prisma.plannedMeal.deleteMany({ where: { id: id.toString() } });
  }

  async deleteByRecipe(recipeId: RecipeId): Promise<void> {
    await this.prisma.plannedMeal.deleteMany({
      where: { recipeId: recipeId.toString() },
    });
  }
}
