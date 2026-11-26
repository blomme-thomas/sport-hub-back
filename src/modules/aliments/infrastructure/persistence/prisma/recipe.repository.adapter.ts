import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../../core/prisma/prisma.service.js';
import type { Recipe } from '../../../domain/entities/recipe.entity.js';
import type { IRecipeRepository } from '../../../domain/ports/outbound/recipe.repository.port.js';
import type { RecipeId } from '../../../domain/value-objects/recipe-id.vo.js';
import { RecipeMapper } from './recipe.mapper.js';

const INCLUDE_ITEMS = {
  items: { orderBy: { position: 'asc' as const } },
};

@Injectable()
export class PrismaRecipeRepositoryAdapter implements IRecipeRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<Recipe[]> {
    const records = await this.prisma.recipe.findMany({
      orderBy: { name: 'asc' },
      include: INCLUDE_ITEMS,
    });
    return records.map((record) => RecipeMapper.toDomain(record));
  }

  async findById(id: RecipeId): Promise<Recipe | null> {
    const record = await this.prisma.recipe.findUnique({
      where: { id: id.toString() },
      include: INCLUDE_ITEMS,
    });
    return record === null ? null : RecipeMapper.toDomain(record);
  }

  async findByNames(names: readonly string[]): Promise<Recipe[]> {
    if (names.length === 0) {
      return [];
    }
    const records = await this.prisma.recipe.findMany({
      where: {
        OR: names.map((name) => ({
          name: { equals: name, mode: 'insensitive' as const },
        })),
      },
      include: INCLUDE_ITEMS,
    });
    return records.map((record) => RecipeMapper.toDomain(record));
  }

  async save(recipe: Recipe): Promise<void> {
    await this.upsert(recipe);
  }

  async saveAll(recipes: readonly Recipe[]): Promise<void> {
    await this.prisma.$transaction(
      recipes.map((recipe) => this.upsert(recipe)),
    );
  }

  private upsert(recipe: Recipe) {
    const id = recipe.id.toString();
    const base = RecipeMapper.toRecipePersistence(recipe);
    const items = RecipeMapper.toItemsPersistence(recipe);
    return this.prisma.recipe.upsert({
      where: { id },
      create: { id, ...base, items: { create: items } },
      update: { ...base, items: { deleteMany: {}, create: items } },
    });
  }

  async delete(id: RecipeId): Promise<void> {
    await this.prisma.recipe.deleteMany({ where: { id: id.toString() } });
  }
}
