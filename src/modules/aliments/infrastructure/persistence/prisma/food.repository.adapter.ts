import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../../core/prisma/prisma.service.js';
import type { Food } from '../../../domain/entities/food.entity.js';
import type { IFoodRepository } from '../../../domain/ports/outbound/food.repository.port.js';
import type { FoodId } from '../../../domain/value-objects/food-id.vo.js';
import { FoodMapper } from './food.mapper.js';

@Injectable()
export class PrismaFoodRepositoryAdapter implements IFoodRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: FoodId): Promise<Food | null> {
    const record = await this.prisma.food.findUnique({
      where: { id: id.toString() },
    });
    return record === null ? null : FoodMapper.toDomain(record);
  }

  async save(food: Food): Promise<void> {
    const data = FoodMapper.toPersistence(food);
    await this.prisma.food.upsert({
      where: { id: food.id.toString() },
      create: data,
      update: data,
    });
  }

  async isUsedInRecipe(id: FoodId): Promise<boolean> {
    const count = await this.prisma.recipeItem.count({
      where: { foodId: id.toString() },
    });
    return count > 0;
  }

  async delete(id: FoodId): Promise<void> {
    await this.prisma.food.deleteMany({ where: { id: id.toString() } });
  }
}
