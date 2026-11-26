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
import type { Food } from '../../domain/entities/food.entity.js';
import {
  Recipe,
  type RecipeItemInput,
} from '../../domain/entities/recipe.entity.js';
import {
  RecipeImportDuplicateError,
  RecipeImportInvalidError,
} from '../../domain/errors/recipe-import.error.js';
import {
  FOOD_REPOSITORY,
  type IFoodRepository,
} from '../../domain/ports/outbound/food.repository.port.js';
import {
  RECIPE_REPOSITORY,
  type IRecipeRepository,
} from '../../domain/ports/outbound/recipe.repository.port.js';
import { RecipeName } from '../../domain/value-objects/recipe-name.vo.js';
import { RECIPE_IMPORT_FORMAT } from '../aliments-import-format.js';
import type { AlimentsImportResultDto } from '../dtos/aliments-import.dto.js';
import { domainIssue, normalizeName } from '../import/import-helpers.js';

const RECIPE_FIELDS = ['name', 'mealTags', 'items'];
const ITEM_FIELDS = ['food', 'component', 'quantity'];
const NAME_MAX = 200;
const COMPONENT_MAX = 20;

/** Item lu dans le fichier, avant résolution de son aliment par nom. */
interface ItemDraft {
  path: string;
  foodName: string;
  component: string | null;
  quantity: number | null;
}

/** Recette lue dans le fichier, avant résolution de ses aliments. */
interface RecipeDraft {
  path: string;
  name: string;
  mealTags: string[];
  items: ItemDraft[];
}

/**
 * Crée les recettes d'un fichier `plan-recettes`, tout ou rien. Chaque item désigne son aliment par son nom, qui doit
 * correspondre à un seul aliment existant. Un nom de recette déjà existant fait refuser le fichier.
 */
@Injectable()
export class ImportRecipesUseCase {
  constructor(
    @Inject(RECIPE_REPOSITORY)
    private readonly recipes: IRecipeRepository,
    @Inject(FOOD_REPOSITORY)
    private readonly foods: IFoodRepository,
  ) {}

  /**
   * @throws RecipeImportInvalidError si le fichier, une recette, un item ou la correspondance d'un aliment est invalide.
   * @throws RecipeImportDuplicateError si une recette porte déjà le nom d'une recette existante (sans tenir compte de la casse).
   */
  async execute(body: unknown): Promise<AlimentsImportResultDto> {
    const issues = new PlanImportIssues('RECIPE_IMPORT');
    const list = readPlanList(body, RECIPE_IMPORT_FORMAT, issues);
    const drafts: RecipeDraft[] = [];
    list?.forEach((raw, index) => {
      const draft = readDraft(
        raw,
        `${RECIPE_IMPORT_FORMAT.listKey}[${index}]`,
        issues,
      );
      if (draft !== null) {
        drafts.push(draft);
      }
    });
    if (issues.count > 0) {
      throw new RecipeImportInvalidError(issues.all);
    }

    const foodsByName = await this.indexFoodsByName(drafts);
    const recipes: { recipe: Recipe; path: string }[] = [];
    for (const draft of drafts) {
      const recipe = buildRecipe(draft, foodsByName, issues);
      if (recipe !== null) {
        recipes.push({ recipe, path: draft.path });
      }
    }
    if (issues.count > 0) {
      throw new RecipeImportInvalidError(issues.all);
    }

    const existing = new Set(
      (
        await this.recipes.findByNames(
          recipes.map((entry) => entry.recipe.name.toString()),
        )
      ).map((recipe) => normalizeName(recipe.name.toString())),
    );
    const duplicates = new PlanImportIssues('RECIPE_IMPORT');
    for (const { recipe, path } of recipes) {
      if (existing.has(normalizeName(recipe.name.toString()))) {
        duplicates.add(
          `${path}.name`,
          'DUPLICATE',
          'une recette porte déjà ce nom',
        );
      }
    }
    if (duplicates.count > 0) {
      throw new RecipeImportDuplicateError(duplicates.all);
    }

    const built = recipes.map((entry) => entry.recipe);
    await this.recipes.saveAll(built);
    return {
      createdCount: built.length,
      ids: built.map((recipe) => recipe.id.toString()),
    };
  }

  /** Charge en une seule requête les aliments nommés par les items, indexés par nom normalisé. */
  private async indexFoodsByName(
    drafts: RecipeDraft[],
  ): Promise<Map<string, Food[]>> {
    const names = [
      ...new Set(
        drafts.flatMap((draft) => draft.items.map((item) => item.foodName)),
      ),
    ];
    const index = new Map<string, Food[]>();
    for (const food of await this.foods.findByNames(names)) {
      const key = normalizeName(food.name.toString());
      index.set(key, [...(index.get(key) ?? []), food]);
    }
    return index;
  }
}

/** Lit une recette et ses items : forme et types seulement, le contenu métier est vérifié après résolution des aliments. */
function readDraft(
  raw: unknown,
  path: string,
  issues: PlanImportIssues,
): RecipeDraft | null {
  if (!isPlanRecord(raw)) {
    issues.add(path, 'ITEM_INVALID', 'une recette doit être un objet');
    return null;
  }
  const before = issues.count;
  rejectUnknownPlanFields(raw, RECIPE_FIELDS, path, issues);
  const name = readPlanText(raw, 'name', path, issues, { max: NAME_MAX });
  const mealTags = readPlanStringList(raw, 'mealTags', path, issues, false);
  const items = readItems(raw, path, issues);
  if (issues.count > before || name === null || mealTags === null) {
    return null;
  }
  return { path, name, mealTags, items };
}

function readItems(
  raw: PlanFields,
  path: string,
  issues: PlanImportIssues,
): ItemDraft[] {
  const value = raw['items'];
  if (value === undefined || value === null) {
    return [];
  }
  if (!Array.isArray(value)) {
    issues.add(`${path}.items`, 'FIELD_TYPE', 'doit être une liste');
    return [];
  }
  const items: ItemDraft[] = [];
  value.forEach((item, index) => {
    const draft = readItem(item, `${path}.items[${index}]`, issues);
    if (draft !== null) {
      items.push(draft);
    }
  });
  return items;
}

function readItem(
  raw: unknown,
  path: string,
  issues: PlanImportIssues,
): ItemDraft | null {
  if (!isPlanRecord(raw)) {
    issues.add(path, 'ITEM_INVALID', 'un item doit être un objet');
    return null;
  }
  const before = issues.count;
  rejectUnknownPlanFields(raw, ITEM_FIELDS, path, issues);
  const foodName = readPlanText(raw, 'food', path, issues, { max: NAME_MAX });
  const component = readPlanText(raw, 'component', path, issues, {
    optional: true,
    max: COMPONENT_MAX,
  });
  const quantity = readPlanNumber(raw, 'quantity', path, issues, {
    optional: true,
    min: 0,
  });
  if (issues.count > before || foodName === null) {
    return null;
  }
  return { path, foodName, component, quantity };
}

/** Résout les aliments d'une recette et la construit ; renvoie `null` et enregistre les erreurs sinon. */
function buildRecipe(
  draft: RecipeDraft,
  foodsByName: Map<string, Food[]>,
  issues: PlanImportIssues,
): Recipe | null {
  const before = issues.count;
  const items: RecipeItemInput[] = [];
  for (const item of draft.items) {
    const matches = foodsByName.get(normalizeName(item.foodName)) ?? [];
    const [food] = matches;
    if (food === undefined) {
      issues.add(
        `${item.path}.food`,
        'FOOD_UNKNOWN',
        `aucun aliment ne porte le nom « ${item.foodName} »`,
      );
    } else if (matches.length > 1) {
      issues.add(
        `${item.path}.food`,
        'FOOD_AMBIGUOUS',
        `plusieurs aliments portent le nom « ${item.foodName} »`,
      );
    } else if (
      item.component !== null &&
      !(food.categories as string[]).includes(item.component)
    ) {
      issues.add(
        `${item.path}.component`,
        'COMPONENT_MISMATCH',
        `l'aliment « ${item.foodName} » n'appartient pas à ce composant`,
      );
    } else {
      items.push({
        foodId: food.id.toString(),
        component: item.component,
        quantity: item.quantity,
      });
    }
  }
  if (issues.count > before) {
    return null;
  }
  try {
    return Recipe.create({
      name: RecipeName.create(draft.name),
      mealTags: draft.mealTags,
      items,
    });
  } catch (error) {
    return domainIssue(error, draft.path, issues);
  }
}
