import type {
  CreateRecipeCommand,
  RecipeDetailDto,
  RecipeDto,
  RecipeItemCommand,
  UpdateRecipeCommand,
} from '../../../application/dtos/recipe.dto.js';
import type {
  NutrientTotals,
  RecipeNutritionSummary,
} from '../../../domain/services/summarize-recipe-nutrition.js';
import {
  IgnoredNutritionLineResponseDto,
  RecipeDetailResponseDto,
  RecipeNutritionResponseDto,
  RecipeNutritionTotalsResponseDto,
} from '../dtos/recipe-detail.response.dto.js';
import type {
  CreateRecipeRequestDto,
  RecipeItemRequestDto,
  UpdateRecipeRequestDto,
} from '../dtos/recipe.request.dto.js';
import {
  RecipeItemResponseDto,
  RecipeResponseDto,
} from '../dtos/recipe.response.dto.js';

function toItemCommands(
  items: RecipeItemRequestDto[] | undefined,
): RecipeItemCommand[] | undefined {
  return items?.map((item) => ({
    foodId: item.foodId,
    component: item.component ?? null,
    quantity: item.quantity ?? null,
  }));
}

function toTotalsResponse(
  totals: NutrientTotals,
): RecipeNutritionTotalsResponseDto {
  return Object.assign(new RecipeNutritionTotalsResponseDto(), totals);
}

function toNutritionResponse(
  summary: RecipeNutritionSummary,
): RecipeNutritionResponseDto {
  return Object.assign(new RecipeNutritionResponseDto(), {
    totals: toTotalsResponse(summary.totals),
    byComponent: Object.fromEntries(
      Object.entries(summary.byComponent).map(([group, totals]) => [
        group,
        toTotalsResponse(totals),
      ]),
    ),
    ignored: summary.ignored.map((line) =>
      Object.assign(new IgnoredNutritionLineResponseDto(), line),
    ),
  });
}

export class RecipeHttpMapper {
  static toCreateCommand(request: CreateRecipeRequestDto): CreateRecipeCommand {
    return {
      name: request.name,
      mealTags: request.mealTags,
      items: toItemCommands(request.items),
    };
  }

  static toUpdateCommand(
    id: string,
    request: UpdateRecipeRequestDto,
  ): UpdateRecipeCommand {
    return {
      id,
      name: request.name,
      mealTags: request.mealTags,
      items: toItemCommands(request.items),
    };
  }

  static toDetailResponse(detail: RecipeDetailDto): RecipeDetailResponseDto {
    const recipe = RecipeHttpMapper.toResponse(detail.recipe);
    return Object.assign(new RecipeDetailResponseDto(), {
      id: recipe.id,
      name: recipe.name,
      mealTags: recipe.mealTags,
      items: recipe.items,
      nutrition: toNutritionResponse(detail.nutrition),
    });
  }

  static toResponse(dto: RecipeDto): RecipeResponseDto {
    return Object.assign(new RecipeResponseDto(), {
      id: dto.id,
      name: dto.name,
      mealTags: dto.mealTags,
      items: dto.items.map((item) =>
        Object.assign(new RecipeItemResponseDto(), {
          foodId: item.foodId,
          component: item.component,
          quantity: item.quantity,
        }),
      ),
    });
  }
}
