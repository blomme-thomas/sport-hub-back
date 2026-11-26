import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { AppModule } from './../src/app.module.js';
import { configureApp } from './../src/app.setup.js';
import { PrismaService } from './../src/core/prisma/prisma.service.js';

const PROBLEM_JSON = /application\/problem\+json/;

const RIZ = {
  name: 'Riz basmati',
  unit: 'g',
  categories: ['feculent'],
  calories: 350,
  proteins: 7,
  carbohydrates: 78,
  fats: 0.6,
  sugars: 0.1,
};
const POULET = {
  name: 'Poulet',
  unit: 'g',
  categories: ['proteine'],
  calories: 165,
};

function planAliments(aliments: unknown[]): Record<string, unknown> {
  return { kind: 'plan-aliments', schemaVersion: 1, aliments };
}

function planRecettes(recettes: unknown[]): Record<string, unknown> {
  return { kind: 'plan-recettes', schemaVersion: 1, recettes };
}

describe('Import des aliments et des recettes (e2e)', () => {
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
    await clean(prisma);
  });

  afterEach(async () => {
    await clean(prisma);
    await app.close();
  });

  function importFoods(body: unknown) {
    return request(app.getHttpServer()).post('/api/foods/import').send(body);
  }

  function importRecipes(body: unknown) {
    return request(app.getHttpServer()).post('/api/recipes/import').send(body);
  }

  describe('POST /api/foods/import', () => {
    it('crée les aliments du fichier et renvoie leurs identifiants', async () => {
      const response = await importFoods(planAliments([RIZ, POULET]));

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({ createdCount: 2 });
      expect(response.body.ids).toHaveLength(2);
      expect(await prisma.food.count()).toBe(2);
    });

    it('accepte un tableau brut d’aliments', async () => {
      const response = await importFoods([RIZ]);

      expect(response.status).toBe(201);
      expect(response.body.createdCount).toBe(1);
    });

    it('refuse un nom déjà existant en 409 et n’enregistre rien', async () => {
      await importFoods(planAliments([RIZ]));

      const response = await importFoods(
        planAliments([POULET, { ...RIZ, name: 'riz basmati' }]),
      );

      expect(response.status).toBe(409);
      expect(response.headers['content-type']).toMatch(PROBLEM_JSON);
      expect(response.body.code).toBe('FOOD_IMPORT_DUPLICATE');
      expect(response.body.errors).toEqual([
        expect.objectContaining({ field: 'aliments[1].name' }),
      ]);
      expect(await prisma.food.count()).toBe(1);
    });

    it('refuse le fichier en entier en 400 si un aliment est invalide', async () => {
      const response = await importFoods(
        planAliments([
          POULET,
          { ...RIZ, name: 'Pâtes', categories: ['fruit'] },
        ]),
      );

      expect(response.status).toBe(400);
      expect(response.body.code).toBe('FOOD_IMPORT_INVALID');
      expect(response.body.errors).toEqual([
        expect.objectContaining({
          field: 'aliments[1]',
          code: 'FOOD_IMPORT_VALUE_INVALID',
        }),
      ]);
      expect(await prisma.food.count()).toBe(0);
    });
  });

  describe('POST /api/recipes/import', () => {
    beforeEach(async () => {
      await importFoods(planAliments([RIZ, POULET]));
    });

    it('crée la recette et rattache ses items aux aliments par nom', async () => {
      const response = await importRecipes(
        planRecettes([
          {
            name: 'Riz au poulet',
            mealTags: ['midi', 'soir'],
            items: [
              { food: 'poulet', component: 'proteine', quantity: 150 },
              { food: 'Riz Basmati', component: 'feculent', quantity: 80 },
            ],
          },
        ]),
      );

      expect(response.status).toBe(201);
      expect(response.body.createdCount).toBe(1);

      const recipe = await prisma.recipe.findFirstOrThrow({
        include: { items: { orderBy: { position: 'asc' } } },
      });
      const foods = await prisma.food.findMany();
      const foodIdByName = new Map(foods.map((food) => [food.name, food.id]));
      expect(recipe.name).toBe('Riz au poulet');
      expect(recipe.mealTags).toEqual(['midi', 'soir']);
      expect(recipe.items.map((item) => item.foodId)).toEqual([
        foodIdByName.get('Poulet'),
        foodIdByName.get('Riz basmati'),
      ]);
    });

    it('refuse un aliment inconnu en 400 et n’enregistre aucune recette', async () => {
      const response = await importRecipes(
        planRecettes([
          {
            name: 'Tofu sauté',
            mealTags: ['midi'],
            items: [{ food: 'Tofu', component: null, quantity: 100 }],
          },
        ]),
      );

      expect(response.status).toBe(400);
      expect(response.body.code).toBe('RECIPE_IMPORT_INVALID');
      expect(response.body.errors).toEqual([
        expect.objectContaining({
          field: 'recettes[0].items[0].food',
          code: 'RECIPE_IMPORT_FOOD_UNKNOWN',
        }),
      ]);
      expect(await prisma.recipe.count()).toBe(0);
    });

    it('refuse un nom de recette déjà existant en 409', async () => {
      const body = planRecettes([
        { name: 'Riz au poulet', mealTags: ['midi'], items: [] },
      ]);
      await importRecipes(body);

      const response = await importRecipes(body);

      expect(response.status).toBe(409);
      expect(response.body.code).toBe('RECIPE_IMPORT_DUPLICATE');
      expect(await prisma.recipe.count()).toBe(1);
    });
  });
});

async function clean(prisma: PrismaService): Promise<void> {
  await prisma.plannedMeal.deleteMany();
  await prisma.recipeItem.deleteMany();
  await prisma.recipe.deleteMany();
  await prisma.food.deleteMany();
}
