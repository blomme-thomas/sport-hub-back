import { Inject, Injectable } from '@nestjs/common';
import {
  isPlanRecord,
  PlanImportIssues,
  readPlanList,
  readPlanNumber,
  readPlanStringList,
  readPlanText,
  rejectUnknownPlanFields,
  type PlanFields,
} from '../../../../shared/import/plan-import.js';
import { Food } from '../../domain/entities/food.entity.js';
import {
  FoodImportDuplicateError,
  FoodImportInvalidError,
} from '../../domain/errors/food-import.error.js';
import {
  FOOD_REPOSITORY,
  type IFoodRepository,
} from '../../domain/ports/outbound/food.repository.port.js';
import { FoodName } from '../../domain/value-objects/food-name.vo.js';
import { FoodUnit } from '../../domain/value-objects/food-unit.vo.js';
import { NutritionValues } from '../../domain/value-objects/nutrition-values.vo.js';
import { FOOD_IMPORT_FORMAT } from '../aliments-import-format.js';
import { domainIssue, normalizeName } from '../import/import-helpers.js';
import type { AlimentsImportResultDto } from '../dtos/aliments-import.dto.js';

const FOOD_FIELDS = [
  'name',
  'unit',
  'categories',
  'calories',
  'proteins',
  'carbohydrates',
  'fats',
  'sugars',
];
const NAME_MAX = 200;
const UNIT_MAX = 20;

/** Crée les aliments d'un fichier `plan-aliments`, tout ou rien. Un nom déjà existant fait refuser le fichier. */
@Injectable()
export class ImportFoodsUseCase {
  constructor(
    @Inject(FOOD_REPOSITORY)
    private readonly foods: IFoodRepository,
  ) {}

  /**
   * @throws FoodImportInvalidError si le fichier ou un aliment est invalide ; la liste indique chaque chemin fautif.
   * @throws FoodImportDuplicateError si un aliment porte déjà le nom d'un aliment existant (sans tenir compte de la casse).
   */
  async execute(body: unknown): Promise<AlimentsImportResultDto> {
    const issues = new PlanImportIssues('FOOD_IMPORT');
    const list = readPlanList(body, FOOD_IMPORT_FORMAT, issues);
    const entries: { food: Food; path: string }[] = [];
    list?.forEach((raw, index) => {
      const path = `${FOOD_IMPORT_FORMAT.listKey}[${index}]`;
      const food = this.buildFood(raw, path, issues);
      if (food !== null) {
        entries.push({ food, path });
      }
    });
    if (issues.count > 0) {
      throw new FoodImportInvalidError(issues.all);
    }

    const existing = new Set(
      (
        await this.foods.findByNames(
          entries.map((entry) => entry.food.name.toString()),
        )
      ).map((food) => normalizeName(food.name.toString())),
    );
    const duplicates = new PlanImportIssues('FOOD_IMPORT');
    for (const { food, path } of entries) {
      if (existing.has(normalizeName(food.name.toString()))) {
        duplicates.add(
          `${path}.name`,
          'DUPLICATE',
          'un aliment porte déjà ce nom',
        );
      }
    }
    if (duplicates.count > 0) {
      throw new FoodImportDuplicateError(duplicates.all);
    }

    const foods = entries.map((entry) => entry.food);
    await this.foods.saveAll(foods);
    return {
      createdCount: foods.length,
      ids: foods.map((food) => food.id.toString()),
    };
  }

  private buildFood(
    raw: unknown,
    path: string,
    issues: PlanImportIssues,
  ): Food | null {
    if (!isPlanRecord(raw)) {
      issues.add(path, 'ITEM_INVALID', 'un aliment doit être un objet');
      return null;
    }
    const before = issues.count;
    rejectUnknownPlanFields(raw, FOOD_FIELDS, path, issues);
    const name = readPlanText(raw, 'name', path, issues, { max: NAME_MAX });
    const unit = readPlanText(raw, 'unit', path, issues, { max: UNIT_MAX });
    const categories = readPlanStringList(
      raw,
      'categories',
      path,
      issues,
      false,
    );
    const nutrition = readNutrition(raw, path, issues);
    if (
      issues.count > before ||
      name === null ||
      unit === null ||
      categories === null
    ) {
      return null;
    }
    try {
      return Food.create({
        name: FoodName.create(name),
        unit: FoodUnit.create(unit),
        categories,
        nutrition: NutritionValues.create(nutrition),
      });
    } catch (error) {
      return domainIssue(error, path, issues);
    }
  }
}

function readNutrition(
  raw: PlanFields,
  path: string,
  issues: PlanImportIssues,
) {
  const read = (key: string) =>
    readPlanNumber(raw, key, path, issues, { optional: true, min: 0 });
  return {
    calories: read('calories'),
    proteins: read('proteins'),
    carbohydrates: read('carbohydrates'),
    fats: read('fats'),
    sugars: read('sugars'),
  };
}
