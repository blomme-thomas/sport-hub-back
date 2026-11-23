import type {
  CreateRecipeCommand,
  RecipeDto,
  RecipeItemCommand,
  UpdateRecipeCommand,
} from '../../../application/dtos/recipe.dto.js';
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
