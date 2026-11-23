import { Controller, Get, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiProblemResponses } from '../../../../../core/filters/api-problem-responses.decorator.js';
import { GetShoppingListUseCase } from '../../../application/use-cases/get-shopping-list.use-case.js';
import { ShoppingListQueryDto } from '../dtos/shopping-list.query.dto.js';
import { ShoppingListItemResponseDto } from '../dtos/shopping-list.response.dto.js';

@ApiTags('aliments')
@Controller('shopping-list')
export class ShoppingListController {
  constructor(private readonly getShoppingList: GetShoppingListUseCase) {}

  @Get()
  @ApiOperation({
    summary:
      'Calcule la liste de courses d’une période (dates incluses), triée par catégorie puis par nom ; non sauvegardée',
  })
  @ApiOkResponse({ type: [ShoppingListItemResponseDto] })
  @ApiProblemResponses(400)
  async get(
    @Query() query: ShoppingListQueryDto,
  ): Promise<ShoppingListItemResponseDto[]> {
    const items = await this.getShoppingList.execute({
      from: query.from,
      to: query.to,
    });
    return items.map((item) =>
      Object.assign(new ShoppingListItemResponseDto(), {
        foodId: item.foodId,
        name: item.name,
        unit: item.unit,
        category: item.category,
        quantity: item.quantity,
        quantityMissing: item.quantityMissing,
      }),
    );
  }
}
