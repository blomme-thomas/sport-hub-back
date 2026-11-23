import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { AppModule } from './../src/app.module.js';
import { configureApp } from './../src/app.setup.js';
import { PrismaService } from './../src/core/prisma/prisma.service.js';

const PROBLEM_JSON = /application\/problem\+json/;
const UNKNOWN_ID = '3f2504e0-4f89-41d3-9a0c-0305e82c3301';

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

describe('Aliments (e2e)', () => {
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
    await prisma.food.deleteMany();
  });

  afterEach(async () => {
    await prisma.food.deleteMany();
    await app.close();
  });

  function create(body: Record<string, unknown>) {
    return request(app.getHttpServer()).post('/api/foods').send(body);
  }

  function get(id: string) {
    return request(app.getHttpServer()).get(`/api/foods/${id}`);
  }

  function list(query: Record<string, unknown> = {}) {
    return request(app.getHttpServer()).get('/api/foods').query(query);
  }

  function patch(id: string, body: Record<string, unknown>) {
    return request(app.getHttpServer()).patch(`/api/foods/${id}`).send(body);
  }

  describe('création', () => {
    it('crée un aliment avec un nom et une unité seuls, les valeurs nutritionnelles étant à null', async () => {
      const res = await create({
        name: 'Sel',
        unit: 'pincée',
        categories: ['autre'],
      }).expect(201);

      expect(res.body).toEqual({
        id: expect.any(String),
        name: 'Sel',
        unit: 'pincée',
        categories: ['autre'],
        calories: null,
        proteins: null,
        carbohydrates: null,
        fats: null,
        sugars: null,
      });
    });

    it('crée un aliment complet à plusieurs catégories et le relit à l’identique par GET', async () => {
      const created = await create({
        ...RIZ,
        categories: ['feculent', 'legume'],
      }).expect(201);

      const res = await get(created.body.id).expect(200);

      expect(res.body).toEqual({
        id: created.body.id,
        name: 'Riz basmati',
        unit: 'g',
        categories: ['feculent', 'legume'],
        calories: 350,
        proteins: 7,
        carbohydrates: 78,
        fats: 0.6,
        sugars: 0.1,
      });
    });

    it('accepte un aliment de catégorie autre sans quantité ni macros', async () => {
      const res = await create({
        name: 'Curcuma',
        unit: 'cuillère à café',
        categories: ['autre'],
      }).expect(201);

      expect(res.body.categories).toEqual(['autre']);
      expect(res.body.calories).toBeNull();
    });

    it('dédoublonne les catégories répétées', async () => {
      const res = await create({
        ...RIZ,
        categories: ['legume', 'proteine', 'legume'],
      }).expect(201);

      expect(res.body.categories).toEqual(['legume', 'proteine']);
    });
  });

  describe('liste', () => {
    it('filtre par catégorie et renvoie aussi les aliments qui en portent plusieurs, triés par nom', async () => {
      await create({ name: 'Poulet', unit: 'g', categories: ['proteine'] });
      await create({
        name: 'Lentilles',
        unit: 'g',
        categories: ['feculent', 'proteine'],
      });
      await create({ name: 'Riz', unit: 'g', categories: ['feculent'] });

      const res = await list({ category: 'proteine' }).expect(200);

      expect(res.body.map((food: { name: string }) => food.name)).toEqual([
        'Lentilles',
        'Poulet',
      ]);
    });

    it('recherche par nom sans tenir compte de la casse, combinée au filtre par catégorie', async () => {
      await create({
        name: 'Riz basmati',
        unit: 'g',
        categories: ['feculent'],
      });
      await create({
        name: 'Riz complet',
        unit: 'g',
        categories: ['feculent'],
      });
      await create({ name: 'Poulet', unit: 'g', categories: ['proteine'] });

      const found = await list({ search: 'RIZ', category: 'feculent' }).expect(
        200,
      );
      const none = await list({ search: 'riz', category: 'proteine' }).expect(
        200,
      );

      expect(found.body.map((food: { name: string }) => food.name)).toEqual([
        'Riz basmati',
        'Riz complet',
      ]);
      expect(none.body).toEqual([]);
    });

    it('renvoie tous les aliments sans critère', async () => {
      await create({ name: 'Poulet', unit: 'g', categories: ['proteine'] });
      await create({ name: 'Riz', unit: 'g', categories: ['feculent'] });

      const res = await list().expect(200);

      expect(res.body).toHaveLength(2);
    });
  });

  describe('modification', () => {
    it('met à jour les valeurs et remplace les catégories, les champs absents restant inchangés', async () => {
      const created = await create(RIZ).expect(201);

      const res = await patch(created.body.id, {
        proteins: 12,
        categories: ['proteine', 'legume'],
      }).expect(200);

      expect(res.body).toEqual({
        id: created.body.id,
        name: 'Riz basmati',
        unit: 'g',
        categories: ['proteine', 'legume'],
        calories: 350,
        proteins: 12,
        carbohydrates: 78,
        fats: 0.6,
        sugars: 0.1,
      });
    });

    it('conserve les catégories quand le champ est absent de la modification', async () => {
      const created = await create(RIZ).expect(201);

      const res = await patch(created.body.id, { name: 'Quinoa' }).expect(200);

      expect(res.body.name).toBe('Quinoa');
      expect(res.body.categories).toEqual(['feculent']);
    });

    it('efface une valeur nutritionnelle envoyée à null sans toucher aux autres', async () => {
      const created = await create(RIZ).expect(201);

      const res = await patch(created.body.id, { calories: null }).expect(200);

      expect(res.body.calories).toBeNull();
      expect(res.body.proteins).toBe(7);
    });

    it('persiste la modification pour les lectures suivantes', async () => {
      const created = await create(RIZ).expect(201);

      await patch(created.body.id, { unit: 'pièce', calories: null }).expect(
        200,
      );

      const res = await get(created.body.id).expect(200);
      expect(res.body.unit).toBe('pièce');
      expect(res.body.calories).toBeNull();
    });
  });

  describe('erreurs', () => {
    it('refuse un nom vide avec INVALID_FOOD au format Problem Details', async () => {
      const res = await create({ ...RIZ, name: '   ' }).expect(400);

      expect(res.headers['content-type']).toMatch(PROBLEM_JSON);
      expect(res.body.code).toBe('INVALID_FOOD');
    });

    it('refuse une unité manquante avec VALIDATION_FAILED', async () => {
      const { unit: _unit, ...withoutUnit } = RIZ;

      const res = await create(withoutUnit).expect(400);

      expect(res.headers['content-type']).toMatch(PROBLEM_JSON);
      expect(res.body.code).toBe('VALIDATION_FAILED');
      expect(res.body.errors).toEqual(
        expect.arrayContaining([expect.objectContaining({ field: 'unit' })]),
      );
    });

    it('refuse une catégorie inconnue avec VALIDATION_FAILED', async () => {
      const res = await create({ ...RIZ, categories: ['fruit'] }).expect(400);

      expect(res.body.code).toBe('VALIDATION_FAILED');
    });

    it('refuse un aliment sans catégorie avec VALIDATION_FAILED', async () => {
      const res = await create({ ...RIZ, categories: [] }).expect(400);

      expect(res.body.code).toBe('VALIDATION_FAILED');
    });

    it('refuse une valeur nutritionnelle négative avec VALIDATION_FAILED', async () => {
      const res = await create({ ...RIZ, calories: -1 }).expect(400);

      expect(res.body.code).toBe('VALIDATION_FAILED');
      expect(res.body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'calories' }),
        ]),
      );
    });

    it('refuse une modification qui retire toutes les catégories avec VALIDATION_FAILED', async () => {
      const created = await create(RIZ).expect(201);

      const res = await patch(created.body.id, { categories: [] }).expect(400);

      expect(res.body.code).toBe('VALIDATION_FAILED');
    });

    it('renvoie 400 VALIDATION_FAILED pour un identifiant qui n’est pas un UUID', async () => {
      const res = await get('riz').expect(400);

      expect(res.body.code).toBe('VALIDATION_FAILED');
      expect(res.body.errors).toEqual(
        expect.arrayContaining([expect.objectContaining({ field: 'id' })]),
      );
    });

    it('renvoie 404 FOOD_NOT_FOUND pour un aliment inconnu, en lecture comme en modification', async () => {
      const read = await get(UNKNOWN_ID).expect(404);
      const updated = await patch(UNKNOWN_ID, { name: 'Quinoa' }).expect(404);

      expect(read.headers['content-type']).toMatch(PROBLEM_JSON);
      expect(read.body.code).toBe('FOOD_NOT_FOUND');
      expect(updated.body.code).toBe('FOOD_NOT_FOUND');
    });
  });
});
