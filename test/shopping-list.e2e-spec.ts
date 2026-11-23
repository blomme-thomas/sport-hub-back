import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { AppModule } from './../src/app.module.js';
import { configureApp } from './../src/app.setup.js';
import { PrismaService } from './../src/core/prisma/prisma.service.js';

describe('Liste de courses (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  beforeEach(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();

    prisma = app.get(PrismaService);
    await cleanup();
  });

  afterEach(async () => {
    await cleanup();
    await app.close();
  });

  async function cleanup(): Promise<void> {
    await prisma.plannedMeal.deleteMany();
    await prisma.recipeItem.deleteMany();
    await prisma.recipe.deleteMany();
    await prisma.food.deleteMany();
  }

  async function createFood(body: Record<string, unknown>): Promise<string> {
    const res = await request(app.getHttpServer())
      .post('/api/foods')
      .send(body);
    return res.body.id as string;
  }

  async function createRecipe(
    name: string,
    items: Record<string, unknown>[],
  ): Promise<string> {
    const res = await request(app.getHttpServer())
      .post('/api/recipes')
      .send({ name, mealTags: ['midi'], items });
    return res.body.id as string;
  }

  async function plan(recipeId: string, date: string): Promise<void> {
    await request(app.getHttpServer())
      .post('/api/meal-plan')
      .send({ recipeId, date, mealTag: 'midi' });
  }

  function list(from: string, to: string) {
    return request(app.getHttpServer())
      .get('/api/shopping-list')
      .query({ from, to });
  }

  it('additionne par aliment, compte deux fois une recette placée deux fois, trie par catégorie puis nom', async () => {
    const riz = await createFood({
      name: 'Riz',
      unit: 'g',
      categories: ['feculent'],
    });
    const poulet = await createFood({
      name: 'Poulet',
      unit: 'g',
      categories: ['proteine'],
    });
    const brocoli = await createFood({
      name: 'Brocoli',
      unit: 'g',
      categories: ['legume'],
    });
    const huile = await createFood({
      name: 'Huile',
      unit: 'ml',
      categories: ['autre'],
    });
    const recette = await createRecipe('Bowl', [
      { foodId: poulet, component: 'proteine', quantity: 150 },
      { foodId: riz, component: 'feculent', quantity: 80 },
      { foodId: brocoli, component: 'legume', quantity: 100 },
      { foodId: huile },
    ]);
    await plan(recette, '2026-11-24');
    await plan(recette, '2026-11-26');

    const res = await list('2026-11-23', '2026-11-29');

    expect(res.status).toBe(200);
    expect(
      res.body.map((item: { name: string; quantity: number | null }) => [
        item.name,
        item.quantity,
      ]),
    ).toEqual([
      ['Poulet', 300],
      ['Brocoli', 200],
      ['Riz', 160],
      ['Huile', null],
    ]);
    expect(res.body[3].quantityMissing).toBe(true);
    expect(res.body[0].quantityMissing).toBe(false);
  });

  it('renvoie une liste vide pour une période sans repas', async () => {
    const res = await list('2026-01-01', '2026-01-07');

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('refuse une période dont la fin précède le début', async () => {
    const res = await list('2026-11-29', '2026-11-23');

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('SHOPPING_LIST_PERIOD_INVALID');
  });
});
