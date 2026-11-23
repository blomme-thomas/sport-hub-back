import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { ApiProblemResponses } from '../../../../../core/filters/api-problem-responses.decorator.js';
import type { PlannedMealDto } from '../../../application/dtos/planned-meal.dto.js';
import { AddPlannedMealUseCase } from '../../../application/use-cases/add-planned-meal.use-case.js';
import { ListPlannedMealsUseCase } from '../../../application/use-cases/list-planned-meals.use-case.js';
import { MovePlannedMealUseCase } from '../../../application/use-cases/move-planned-meal.use-case.js';
import { RemovePlannedMealUseCase } from '../../../application/use-cases/remove-planned-meal.use-case.js';
import {
  CreatePlannedMealRequestDto,
  MovePlannedMealRequestDto,
  PlannedMealIdParamDto,
  PlannedMealWeekQueryDto,
} from '../dtos/planned-meal.request.dto.js';
import { PlannedMealResponseDto } from '../dtos/planned-meal.response.dto.js';

function toResponse(dto: PlannedMealDto): PlannedMealResponseDto {
  return Object.assign(new PlannedMealResponseDto(), {
    id: dto.id,
    recipeId: dto.recipeId,
    date: dto.date,
    mealTag: dto.mealTag,
  });
}

@ApiTags('aliments')
@Controller('meal-plan')
export class MealPlanController {
  constructor(
    private readonly listPlannedMeals: ListPlannedMealsUseCase,
    private readonly addPlannedMeal: AddPlannedMealUseCase,
    private readonly movePlannedMeal: MovePlannedMealUseCase,
    private readonly removePlannedMeal: RemovePlannedMealUseCase,
  ) {}

  @Get()
  @ApiOperation({
    summary:
      'Liste les repas planifiés d’une semaine ISO (du lundi au dimanche), triés par date puis par repas',
  })
  @ApiOkResponse({ type: [PlannedMealResponseDto] })
  @ApiProblemResponses(400)
  async list(
    @Query() query: PlannedMealWeekQueryDto,
  ): Promise<PlannedMealResponseDto[]> {
    const items = await this.listPlannedMeals.execute({ week: query.week });
    return items.map(toResponse);
  }

  @Post()
  @ApiOperation({
    summary:
      'Place une recette à une date et pour un repas ; la même recette peut être placée plusieurs fois',
  })
  @ApiCreatedResponse({ type: PlannedMealResponseDto })
  @ApiProblemResponses(400, 404)
  async create(
    @Body() request: CreatePlannedMealRequestDto,
  ): Promise<PlannedMealResponseDto> {
    const dto = await this.addPlannedMeal.execute(request);
    return toResponse(dto);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Déplace un repas planifié vers une autre date ou un autre repas',
  })
  @ApiOkResponse({ type: PlannedMealResponseDto })
  @ApiProblemResponses(400, 404)
  async move(
    @Param() params: PlannedMealIdParamDto,
    @Body() request: MovePlannedMealRequestDto,
  ): Promise<PlannedMealResponseDto> {
    const dto = await this.movePlannedMeal.execute({
      id: params.id,
      date: request.date,
      mealTag: request.mealTag,
    });
    return toResponse(dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary:
      'Retire un repas du planning ; les autres placements ne sont pas touchés',
  })
  @ApiNoContentResponse({ description: 'Repas retiré du planning' })
  @ApiProblemResponses(400, 404)
  async remove(@Param() params: PlannedMealIdParamDto): Promise<void> {
    await this.removePlannedMeal.execute({ id: params.id });
  }
}
