import type { FoodCategory } from '../../domain/value-objects/food-category.vo.js';

export interface SeedFood {
  name: string;
  unit: string;
  categories: readonly FoodCategory[];
  nutrition: {
    calories: number | null;
    proteins: number | null;
    carbohydrates: number | null;
    fats: number | null;
    sugars: number | null;
  };
}

/**
 * Sélection initiale d'aliments, valeurs pour 100 g. Source : Ciqual (ANSES), licence Etalab 2.0.
 * Hypothèse : valeurs arrondies à valider contre ciqual.anses.fr avant tout usage.
 */
export const CIQUAL_SEED_FOODS: readonly SeedFood[] = [
  {
    name: 'Poulet',
    unit: 'g',
    categories: ['proteine'],
    nutrition: {
      calories: 165,
      proteins: 31,
      carbohydrates: 0,
      fats: 3.6,
      sugars: 0,
    },
  },
  {
    name: 'Œuf entier',
    unit: 'g',
    categories: ['proteine'],
    nutrition: {
      calories: 143,
      proteins: 12.6,
      carbohydrates: 0.7,
      fats: 9.5,
      sugars: 0.7,
    },
  },
  {
    name: 'Thon au naturel',
    unit: 'g',
    categories: ['proteine'],
    nutrition: {
      calories: 116,
      proteins: 26,
      carbohydrates: 0,
      fats: 1,
      sugars: 0,
    },
  },
  {
    name: 'Lentilles',
    unit: 'g',
    categories: ['proteine', 'feculent'],
    nutrition: {
      calories: 116,
      proteins: 9,
      carbohydrates: 20,
      fats: 0.4,
      sugars: 1.8,
    },
  },
  {
    name: 'Riz',
    unit: 'g',
    categories: ['feculent'],
    nutrition: {
      calories: 130,
      proteins: 2.7,
      carbohydrates: 28,
      fats: 0.3,
      sugars: 0.1,
    },
  },
  {
    name: 'Pâtes',
    unit: 'g',
    categories: ['feculent'],
    nutrition: {
      calories: 131,
      proteins: 5,
      carbohydrates: 25,
      fats: 1.1,
      sugars: 0.6,
    },
  },
  {
    name: 'Pomme de terre',
    unit: 'g',
    categories: ['feculent'],
    nutrition: {
      calories: 87,
      proteins: 1.9,
      carbohydrates: 20,
      fats: 0.1,
      sugars: 0.9,
    },
  },
  {
    name: 'Flocons d’avoine',
    unit: 'g',
    categories: ['feculent'],
    nutrition: {
      calories: 379,
      proteins: 13,
      carbohydrates: 68,
      fats: 7,
      sugars: 1,
    },
  },
  {
    name: 'Brocoli',
    unit: 'g',
    categories: ['legume'],
    nutrition: {
      calories: 35,
      proteins: 2.4,
      carbohydrates: 7,
      fats: 0.4,
      sugars: 1.4,
    },
  },
  {
    name: 'Carotte',
    unit: 'g',
    categories: ['legume'],
    nutrition: {
      calories: 41,
      proteins: 0.9,
      carbohydrates: 10,
      fats: 0.2,
      sugars: 4.7,
    },
  },
  {
    name: 'Tomate',
    unit: 'g',
    categories: ['legume'],
    nutrition: {
      calories: 18,
      proteins: 0.9,
      carbohydrates: 3.9,
      fats: 0.2,
      sugars: 2.6,
    },
  },
  {
    name: 'Épinard',
    unit: 'g',
    categories: ['legume'],
    nutrition: {
      calories: 23,
      proteins: 2.9,
      carbohydrates: 3.6,
      fats: 0.4,
      sugars: 0.4,
    },
  },
  {
    name: 'Banane',
    unit: 'g',
    categories: ['autre'],
    nutrition: {
      calories: 89,
      proteins: 1.1,
      carbohydrates: 23,
      fats: 0.3,
      sugars: 12,
    },
  },
  {
    name: 'Huile d’olive',
    unit: 'g',
    categories: ['autre'],
    nutrition: {
      calories: 884,
      proteins: 0,
      carbohydrates: 0,
      fats: 100,
      sugars: 0,
    },
  },
];
