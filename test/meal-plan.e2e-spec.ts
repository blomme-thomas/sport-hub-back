import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { AppModule } from './../src/app.module.js';
import { configureApp } from './../src/app.setup.js';
import { PrismaService } from './../src/core/prisma/prisma.service.js';

const PROBLEM_JSON = /application\/problem\+json/;
const UNKNOWN_ID = '3f2504e0-4f89-41d3-9a0c-0305e82c3301';

describe('Planning des repas (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let riz: string;

  beforeEach(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();

    prisma = app.get(PrismaService);
    await cleanup();
    riz = await createRecipe('Riz au poulet');
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

  async function createRecipe(name: string): Promise<string> {
    const res = await request(app.getHttpServer())
      .post('/api/recipes')
      .send({ name, mealTags: ['midi', 'soir'] });
    return res.body.id as string;
  }

  function plan(body: Record<string, unknown>) {
    return request(app.getHttpServer()).post('/api/meal-plan').send(body);
  }

  function week(value: string) {
    return request(app.getHttpServer())
      .get('/api/meal-plan')
      .query({ week: value });
  }

  it('place une recette deux fois, chaque placement a son identifiant', async () => {
    const first = await plan({
      recipeId: riz,
      date: '2026-11-25',
      mealTag: 'midi',
    });
    const second = await plan({
      recipeId: riz,
      date: '2026-11-25',
      mealTag: 'midi',
    });

    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect(first.body.id).not.toBe(second.body.id);
  });

  it('liste les repas de la semaine ISO, triés par date puis par repas', async () => {
    await plan({ recipeId: riz, date: '2026-11-25', mealTag: 'soir' });
    await plan({ recipeId: riz, date: '2026-11-25', mealTag: 'matin' });
    await plan({ recipeId: riz, date: '2026-12-01', mealTag: 'midi' });

    const res = await week('2026-W48');

    expect(res.status).toBe(200);
    expect(
      res.body.map((meal: { date: string; mealTag: string }) => [
        meal.date,
        meal.mealTag,
      ]),
    ).toEqual([
      ['2026-11-25', 'matin'],
      ['2026-11-25', 'soir'],
    ]);
  });

  it('supprime un placement sans toucher à l’autre', async () => {
    const first = await plan({
      recipeId: riz,
      date: '2026-11-25',
      mealTag: 'midi',
    });
    const second = await plan({
      recipeId: riz,
      date: '2026-11-26',
      mealTag: 'midi',
    });

    const res = await request(app.getHttpServer()).delete(
      `/api/meal-plan/${first.body.id as string}`,
    );

    expect(res.status).toBe(204);
    const remaining = await week('2026-W48');
    expect(remaining.body.map((meal: { id: string }) => meal.id)).toEqual([
      second.body.id,
    ]);
  });

  it('déplace un repas vers une autre date ou un autre repas', async () => {
    const created = await plan({
      recipeId: riz,
      date: '2026-11-25',
      mealTag: 'midi',
    });

    const res = await request(app.getHttpServer())
      .patch(`/api/meal-plan/${created.body.id as string}`)
      .send({ date: '2026-11-27', mealTag: 'soir' });

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(created.body.id);
    expect(res.body.date).toBe('2026-11-27');
    expect(res.body.mealTag).toBe('soir');
  });

  it('renvoie 404 pour une recette inconnue ou un repas inconnu', async () => {
    const unknownRecipe = await plan({
      recipeId: UNKNOWN_ID,
      date: '2026-11-25',
      mealTag: 'midi',
    });
    const unknownMeal = await request(app.getHttpServer()).delete(
      `/api/meal-plan/${UNKNOWN_ID}`,
    );

    expect(unknownRecipe.status).toBe(404);
    expect(unknownRecipe.body.code).toBe('RECIPE_NOT_FOUND');
    expect(unknownMeal.status).toBe(404);
    expect(unknownMeal.body.code).toBe('PLANNED_MEAL_NOT_FOUND');
  });

  it('refuse une date inexistante et une semaine mal formée', async () => {
    const badDate = await plan({
      recipeId: riz,
      date: '2026-02-30',
      mealTag: 'midi',
    });
    const badWeek = await week('2026-48');

    expect(badDate.status).toBe(400);
    expect(badDate.headers['content-type']).toMatch(PROBLEM_JSON);
    expect(badDate.body.code).toBe('INVALID_PLANNED_MEAL');
    expect(badWeek.status).toBe(400);
    expect(badWeek.body.code).toBe('VALIDATION_FAILED');
  });

  it('refuse de supprimer une recette planifiée sans confirmation, et la supprime avec', async () => {
    const meal = await plan({
      recipeId: riz,
      date: '2026-11-25',
      mealTag: 'midi',
    });

    const refused = await request(app.getHttpServer()).delete(
      `/api/recipes/${riz}`,
    );

    expect(refused.status).toBe(409);
    expect(refused.body.code).toBe('RECIPE_IN_USE');
    expect(await prisma.plannedMeal.count()).toBe(1);

    const confirmed = await request(app.getHttpServer()).delete(
      `/api/recipes/${riz}?confirm=true`,
    );

    expect(confirmed.status).toBe(204);
    expect(
      await prisma.plannedMeal.count({ where: { id: meal.body.id as string } }),
    ).toBe(0);
    expect(await prisma.recipe.count({ where: { id: riz } })).toBe(0);
  });
});
