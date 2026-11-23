import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../../core/prisma/prisma.service.js';
import type { Prisma } from '../../../../../core/prisma/generated/client.js';
import type {
  FoodListCriteria,
  FoodListItem,
  IFoodListReadModel,
} from '../../../domain/ports/outbound/food-list.read-model.port.js';
import { decimalToNumber } from './food.mapper.js';

@Injectable()
export class PrismaFoodListReadModel implements IFoodListReadModel {
  constructor(private readonly prisma: PrismaService) {}

  async list(criteria: FoodListCriteria): Promise<FoodListItem[]> {
    const records = await this.prisma.food.findMany({
      where: PrismaFoodListReadModel.toWhere(criteria),
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
    });
    return records.map((record) => ({
      id: record.id,
      name: record.name,
      unit: record.unit,
      categories: record.categories,
      calories: decimalToNumber(record.calories),
      proteins: decimalToNumber(record.proteins),
      carbohydrates: decimalToNumber(record.carbohydrates),
      fats: decimalToNumber(record.fats),
      sugars: decimalToNumber(record.sugars),
    }));
  }

  private static toWhere(criteria: FoodListCriteria): Prisma.FoodWhereInput {
    const where: Prisma.FoodWhereInput = {};
    if (criteria.category !== null) {
      where.categories = { has: criteria.category };
    }
    if (criteria.search !== null) {
      where.name = { contains: criteria.search, mode: 'insensitive' };
    }
    return where;
  }
}
