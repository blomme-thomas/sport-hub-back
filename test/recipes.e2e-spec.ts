import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { AppModule } from './../src/app.module.js';
import { configureApp } from './../src/app.setup.js';
import { PrismaService } from './../src/core/prisma/prisma.service.js';

const PROBLEM_JSON = /application\/problem\+json/;
const UNKNOWN_ID = '3f2504e0-4f89-41d3-9a0c-0305e82c3301';

describe('Recettes (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let riz: string;
  let poulet: string;
  let brocoli: string;

  beforeEach(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();

    prisma = app.get(PrismaService);
    await prisma.recipeItem.deleteMany();
    await prisma.recipe.deleteMany();
    await prisma.food.deleteMany();

    riz = await createFood({
      name: 'Riz',
      unit: 'g',
      categories: ['feculent'],
    });
    poulet = await createFood({
      name: 'Poulet',
      unit: 'g',
      categories: ['proteine'],
    });
    brocoli = await createFood({
      name: 'Brocoli',
      unit: 'g',
      categories: ['legume'],
    });
  });

  afterEach(async () => {
    await prisma.recipeItem.deleteMany();
    await prisma.recipe.deleteMany();
    await prisma.food.deleteMany();
    await app.close();
  });

  async function createFood(body: Record<string, unknown>): Promise<string> {
    const res = await request(app.getHttpServer())
      .post('/api/foods')
      .send(body);
    return res.body.id as string;
  }

  function create(body: Record<string, unknown>) {
    return request(app.getHttpServer()).post('/api/recipes').send(body);
  }

  function get(id: string) {
    return request(app.getHttpServer()).get(`/api/recipes/${id}`);
  }

  function patch(id: string, body: Record<string, unknown>) {
    return request(app.getHttpServer()).patch(`/api/recipes/${id}`).send(body);
  }

  function remove(id: string) {
    return request(app.getHttpServer()).delete(`/api/recipes/${id}`);
  }

  it('crée une recette avec composition et la relit avec son ordre', async () => {
    const res = await create({
      name: 'Riz au poulet',
      mealTags: ['midi', 'soir'],
      items: [
        { foodId: poulet, component: 'proteine', quantity: 150 },
        { foodId: riz, component: 'feculent', quantity: 80 },
      ],
    });

    expect(res.status).toBe(201);
    expect(res.body.mealTags).toEqual(['midi', 'soir']);
    const read = await get(res.body.id as string);
    expect(read.status).toBe(200);
    expect(read.body.items).toEqual([
      { foodId: poulet, component: 'proteine', quantity: 150 },
      { foodId: riz, component: 'feculent', quantity: 80 },
    ]);
  });

  it('accepte une recette sans composant, aux quantités vides (petit-déjeuner)', async () => {
    const res = await create({
      name: 'Porridge',
      mealTags: ['matin'],
      items: [{ foodId: riz }],
    });

    expect(res.status).toBe(201);
    expect(res.body.items).toEqual([
      { foodId: riz, component: null, quantity: null },
    ]);
  });

  it('refuse un aliment placé dans un composant d’une autre famille', async () => {
    const res = await create({
      name: 'Erreur',
      mealTags: ['midi'],
      items: [{ foodId: brocoli, component: 'proteine', quantity: 100 }],
    });

    expect(res.status).toBe(400);
    expect(res.headers['content-type']).toMatch(PROBLEM_JSON);
    expect(res.body.code).toBe('INVALID_RECIPE');
  });

  it('refuse un tag de repas inconnu et une recette sans tag', async () => {
    const unknown = await create({ name: 'X', mealTags: ['goûter'] });
    const empty = await create({ name: 'X', mealTags: [] });

    expect(unknown.body.code).toBe('VALIDATION_FAILED');
    expect(empty.body.code).toBe('VALIDATION_FAILED');
  });

  it('remplace la composition à la modification', async () => {
    const created = await create({
      name: 'Riz au poulet',
      mealTags: ['midi'],
      items: [{ foodId: poulet, component: 'proteine', quantity: 150 }],
    });

    const res = await patch(created.body.id as string, {
      items: [{ foodId: brocoli, component: 'legume', quantity: 100 }],
    });

    expect(res.status).toBe(200);
    expect(res.body.items).toEqual([
      { foodId: brocoli, component: 'legume', quantity: 100 },
    ]);
  });

  it('renvoie 404 RECIPE_NOT_FOUND pour une recette inconnue', async () => {
    const res = await get(UNKNOWN_ID);

    expect(res.status).toBe(404);
    expect(res.body.code).toBe('RECIPE_NOT_FOUND');
  });

  it('supprime une recette sans toucher aux aliments', async () => {
    const created = await create({
      name: 'Riz',
      mealTags: ['midi'],
      items: [{ foodId: riz, component: 'feculent', quantity: 80 }],
    });

    const res = await remove(created.body.id as string);

    expect(res.status).toBe(204);
    expect((await get(created.body.id as string)).status).toBe(404);
    expect(await prisma.food.count({ where: { id: riz } })).toBe(1);
  });

  it('liste les recettes triées par nom', async () => {
    await create({ name: 'Zucchini', mealTags: ['midi'] });
    await create({ name: 'Avocat', mealTags: ['midi'] });

    const res = await request(app.getHttpServer()).get('/api/recipes');

    expect(res.status).toBe(200);
    expect(res.body.map((recipe: { name: string }) => recipe.name)).toEqual([
      'Avocat',
      'Zucchini',
    ]);
  });
});
