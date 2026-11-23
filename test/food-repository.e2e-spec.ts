import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from './../src/app.module.js';
import { PrismaService } from './../src/core/prisma/prisma.service.js';
import { configureApp } from './../src/app.setup.js';
import { Food } from './../src/modules/aliments/domain/entities/food.entity.js';
import {
  FOOD_LIST_READ_MODEL,
  type IFoodListReadModel,
} from './../src/modules/aliments/domain/ports/outbound/food-list.read-model.port.js';
import {
  FOOD_REPOSITORY,
  type IFoodRepository,
} from './../src/modules/aliments/domain/ports/outbound/food.repository.port.js';
import { FoodId } from './../src/modules/aliments/domain/value-objects/food-id.vo.js';
import { FoodName } from './../src/modules/aliments/domain/value-objects/food-name.vo.js';
import { FoodUnit } from './../src/modules/aliments/domain/value-objects/food-unit.vo.js';
import { NutritionValues } from './../src/modules/aliments/domain/value-objects/nutrition-values.vo.js';

const UNKNOWN_ID = '3f2504e0-4f89-41d3-9a0c-0305e82c3301';

function nutrition(
  overrides: Partial<Parameters<typeof NutritionValues.create>[0]> = {},
): NutritionValues {
  return NutritionValues.create({
    calories: null,
    proteins: null,
    carbohydrates: null,
    fats: null,
    sugars: null,
    ...overrides,
  });
}

function aliment(name: string, categories: string[], calories: number | null) {
  return Food.create({
    name: FoodName.create(name),
    unit: FoodUnit.create('g'),
    categories,
    nutrition: nutrition({ calories }),
  });
}

describe('FoodRepository (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let repository: IFoodRepository;
  let readModel: IFoodListReadModel;

  beforeEach(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();

    prisma = app.get(PrismaService);
    repository = app.get<IFoodRepository>(FOOD_REPOSITORY, { strict: false });
    readModel = app.get<IFoodListReadModel>(FOOD_LIST_READ_MODEL, {
      strict: false,
    });
    await prisma.food.deleteMany();
  });

  afterEach(async () => {
    await prisma.food.deleteMany();
    await app.close();
  });

  describe('save et findById', () => {
    it('crée un aliment et le relit avec ses valeurs décimales et ses catégories', async () => {
      const original = Food.create({
        name: FoodName.create('Riz basmati'),
        unit: FoodUnit.create('g'),
        categories: ['feculent', 'legume'],
        nutrition: nutrition({ calories: 350, fats: 0.6 }),
      });

      await repository.save(original);
      const found = await repository.findById(original.id);

      expect(found?.name.toString()).toBe('Riz basmati');
      expect(found?.categories).toEqual(['feculent', 'legume']);
      expect(found?.nutrition.calories).toBe(350);
      expect(found?.nutrition.fats).toBe(0.6);
      expect(found?.nutrition.proteins).toBeNull();
    });

    it('met à jour un aliment existant sous le même identifiant', async () => {
      const created = aliment('Riz', ['feculent'], 350);
      await repository.save(created);

      await repository.save(
        created.change({ categories: ['proteine'], nutrition: nutrition() }),
      );

      expect(await prisma.food.count()).toBe(1);
      const stored = await prisma.food.findUniqueOrThrow({
        where: { id: created.id.toString() },
      });
      expect(stored.categories).toEqual(['proteine']);
      expect(stored.calories).toBeNull();
    });

    it('renvoie null pour un identifiant inconnu', async () => {
      await expect(
        repository.findById(FoodId.from(UNKNOWN_ID)),
      ).resolves.toBeNull();
    });
  });

  describe('read model list', () => {
    it('filtre par catégorie sur toute la liste de catégories', async () => {
      await repository.save(
        aliment('Lentilles', ['feculent', 'proteine'], null),
      );
      await repository.save(aliment('Riz', ['feculent'], null));

      const found = await readModel.list({
        category: 'proteine',
        search: null,
      });

      expect(found.map((item) => item.name)).toEqual(['Lentilles']);
      expect(found[0]?.categories).toEqual(['feculent', 'proteine']);
    });

    it('recherche le nom sans tenir compte de la casse et renvoie les valeurs en nombres', async () => {
      await repository.save(aliment('Riz basmati', ['feculent'], 350));
      await repository.save(aliment('Poulet', ['proteine'], 165));

      const found = await readModel.list({ category: null, search: 'BASMATI' });

      expect(found).toHaveLength(1);
      expect(found[0]).toMatchObject({
        name: 'Riz basmati',
        calories: 350,
        proteins: null,
      });
    });

    it('trie les aliments par nom croissant', async () => {
      await repository.save(aliment('Poulet', ['proteine'], null));
      await repository.save(aliment('Abricot', ['autre'], null));

      const found = await readModel.list({ category: null, search: null });

      expect(found.map((item) => item.name)).toEqual(['Abricot', 'Poulet']);
    });
  });
});
