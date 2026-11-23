import { describe, expect, it } from 'vitest';
import type { PrismaClient } from '../../../../core/prisma/generated/client.js';
import { CIQUAL_SEED_FOODS } from './ciqual-seed.data.js';
import { seedFoods } from './seed-foods.js';

interface Row {
  id: string;
  name: string;
  unit: string;
  categories: string[];
  calories: number | null;
  proteins: number | null;
  carbohydrates: number | null;
  fats: number | null;
  sugars: number | null;
}

function fakePrisma(): { client: PrismaClient; rows: Row[] } {
  const rows: Row[] = [];
  const food = {
    findFirst: async ({ where }: { where: { name: string } }) =>
      rows.find((row) => row.name === where.name) ?? null,
    create: async ({ data }: { data: Omit<Row, 'id'> & { id: string } }) => {
      rows.push({ ...data });
      return data;
    },
    update: async ({
      where,
      data,
    }: {
      where: { id: string };
      data: Partial<Row>;
    }) => {
      const row = rows.find((candidate) => candidate.id === where.id);
      Object.assign(row as Row, data);
      return row;
    },
  };
  return { client: { food } as unknown as PrismaClient, rows };
}

describe('seedFoods', () => {
  it('insère la sélection initiale avec ses catégories', async () => {
    const { client, rows } = fakePrisma();

    const result = await seedFoods(client);

    expect(result).toEqual({
      created: CIQUAL_SEED_FOODS.length,
      updated: 0,
    });
    expect(rows).toHaveLength(CIQUAL_SEED_FOODS.length);
    expect(
      rows.find((row) => row.name === 'Lentilles cuites')?.categories,
    ).toEqual(['proteine', 'feculent']);
  });

  it('ne crée aucun doublon à la seconde exécution', async () => {
    const { client, rows } = fakePrisma();
    await seedFoods(client);

    const result = await seedFoods(client);

    expect(result).toEqual({ created: 0, updated: CIQUAL_SEED_FOODS.length });
    expect(rows).toHaveLength(CIQUAL_SEED_FOODS.length);
    expect(new Set(rows.map((row) => row.name)).size).toBe(rows.length);
  });

  it('a des noms uniques et des valeurs pour 100 g valides dans la sélection', () => {
    const names = CIQUAL_SEED_FOODS.map((food) => food.name);

    expect(new Set(names).size).toBe(names.length);
    for (const food of CIQUAL_SEED_FOODS) {
      expect(food.categories.length).toBeGreaterThan(0);
      expect(food.nutrition.calories).toBeGreaterThanOrEqual(0);
    }
  });
});
