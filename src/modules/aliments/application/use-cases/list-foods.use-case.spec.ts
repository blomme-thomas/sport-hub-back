import { Test } from '@nestjs/testing';
import {
  type FoodListCriteria,
  type FoodListItem,
  type IFoodListReadModel,
  FOOD_LIST_READ_MODEL,
} from '../../domain/ports/outbound/food-list.read-model.port.js';
import { ListFoodsUseCase } from './list-foods.use-case.js';

const RIZ: FoodListItem = {
  id: '0f8fad5b-d9cb-469f-a165-70867728950e',
  name: 'Riz basmati',
  unit: 'g',
  categories: ['feculent'],
  calories: 350,
  proteins: 7,
  carbohydrates: 78,
  fats: 0.6,
  sugars: 0.1,
};

const LENTILLES: FoodListItem = {
  id: '3f2504e0-4f89-41d3-9a0c-0305e82c3301',
  name: 'Lentilles',
  unit: 'g',
  categories: ['proteine', 'feculent'],
  calories: null,
  proteins: null,
  carbohydrates: null,
  fats: null,
  sugars: null,
};

class FakeFoodListReadModel implements IFoodListReadModel {
  criteria: FoodListCriteria[] = [];
  items: FoodListItem[] = [];

  list(criteria: FoodListCriteria): Promise<FoodListItem[]> {
    this.criteria.push(criteria);
    return Promise.resolve(this.items);
  }
}

describe('ListFoodsUseCase', () => {
  let useCase: ListFoodsUseCase;
  let readModel: FakeFoodListReadModel;

  beforeEach(async () => {
    readModel = new FakeFoodListReadModel();
    const moduleRef = await Test.createTestingModule({
      providers: [
        ListFoodsUseCase,
        { provide: FOOD_LIST_READ_MODEL, useValue: readModel },
      ],
    }).compile();
    useCase = moduleRef.get(ListFoodsUseCase);
  });

  describe('critères', () => {
    it('ne filtre ni par catégorie ni par nom sans critère', async () => {
      await useCase.execute({});

      expect(readModel.criteria).toEqual([{ category: null, search: null }]);
    });

    it('transmet le filtre par catégorie', async () => {
      await useCase.execute({ category: 'proteine' });

      expect(readModel.criteria).toEqual([
        { category: 'proteine', search: null },
      ]);
    });

    it('transmet la recherche par nom', async () => {
      await useCase.execute({ search: 'riz' });

      expect(readModel.criteria).toEqual([{ category: null, search: 'riz' }]);
    });

    it('transmet le filtre par catégorie combiné à la recherche par nom', async () => {
      await useCase.execute({ category: 'feculent', search: 'riz' });

      expect(readModel.criteria).toEqual([
        { category: 'feculent', search: 'riz' },
      ]);
    });
  });

  describe('résultats', () => {
    it('renvoie les aliments fournis par le read model', async () => {
      readModel.items = [RIZ, LENTILLES];

      const result = await useCase.execute({});

      expect(result).toEqual([RIZ, LENTILLES]);
    });

    it('renvoie une liste vide quand aucun aliment ne correspond', async () => {
      readModel.items = [];

      const result = await useCase.execute({ search: 'inexistant' });

      expect(result).toEqual([]);
    });
  });
});
