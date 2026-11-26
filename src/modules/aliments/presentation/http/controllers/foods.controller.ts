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
  ApiBody,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { ApiProblemResponses } from '../../../../../core/filters/api-problem-responses.decorator.js';
import { CreateFoodUseCase } from '../../../application/use-cases/create-food.use-case.js';
import { ImportFoodsUseCase } from '../../../application/use-cases/import-foods.use-case.js';
import { AlimentsImportHttpMapper } from '../mappers/aliments-import.http-mapper.js';
import { AlimentsImportResponseDto } from '../dtos/aliments-import.response.dto.js';
import { DeleteFoodUseCase } from '../../../application/use-cases/delete-food.use-case.js';
import { GetFoodUseCase } from '../../../application/use-cases/get-food.use-case.js';
import { ListFoodsUseCase } from '../../../application/use-cases/list-foods.use-case.js';
import { UpdateFoodUseCase } from '../../../application/use-cases/update-food.use-case.js';
import { CreateFoodRequestDto } from '../dtos/create-food.request.dto.js';
import { FoodIdParamDto } from '../dtos/food-id.param.dto.js';
import { FoodResponseDto } from '../dtos/food.response.dto.js';
import { ListFoodsRequestDto } from '../dtos/list-foods.request.dto.js';
import { UpdateFoodRequestDto } from '../dtos/update-food.request.dto.js';
import { FoodHttpMapper } from '../mappers/food.http-mapper.js';

@ApiTags('aliments')
@Controller('foods')
export class FoodsController {
  constructor(
    private readonly createFood: CreateFoodUseCase,
    private readonly updateFood: UpdateFoodUseCase,
    private readonly getFood: GetFoodUseCase,
    private readonly listFoods: ListFoodsUseCase,
    private readonly deleteFood: DeleteFoodUseCase,
    private readonly importFoods: ImportFoodsUseCase,
  ) {}

  @Post('import')
  @ApiOperation({
    summary:
      'Importe un fichier plan-aliments (ou un tableau brut d’aliments) : tous les aliments sont créés, ou aucun. Un nom déjà existant, sans tenir compte de la casse, fait refuser le fichier (409)',
  })
  @ApiBody({
    description: 'Fichier plan-aliments, ou tableau brut d’aliments',
    schema: { type: 'object' },
  })
  @ApiCreatedResponse({ type: AlimentsImportResponseDto })
  @ApiProblemResponses(400, 409)
  async importAliments(
    @Body() body: unknown,
  ): Promise<AlimentsImportResponseDto> {
    const dto = await this.importFoods.execute(body);
    return AlimentsImportHttpMapper.toResponse(dto);
  }

  @Get()
  @ApiOperation({
    summary:
      'Liste les aliments, filtrables par catégorie et recherchables par nom (sans tenir compte de la casse)',
  })
  @ApiOkResponse({ type: [FoodResponseDto] })
  @ApiProblemResponses(400)
  async list(
    @Query() request: ListFoodsRequestDto,
  ): Promise<FoodResponseDto[]> {
    const items = await this.listFoods.execute(
      FoodHttpMapper.toListQuery(request),
    );
    return items.map((item) => FoodHttpMapper.toResponse(item));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Renvoie un aliment et ses valeurs pour 100 g' })
  @ApiOkResponse({ type: FoodResponseDto })
  @ApiProblemResponses(400, 404)
  async get(@Param() params: FoodIdParamDto): Promise<FoodResponseDto> {
    const dto = await this.getFood.execute({ id: params.id });
    return FoodHttpMapper.toResponse(dto);
  }

  @Post()
  @ApiOperation({
    summary:
      'Crée un aliment avec un nom, une unité et au moins une catégorie ; les valeurs nutritionnelles sont facultatives',
  })
  @ApiCreatedResponse({ type: FoodResponseDto })
  @ApiProblemResponses(400)
  async create(
    @Body() request: CreateFoodRequestDto,
  ): Promise<FoodResponseDto> {
    const dto = await this.createFood.execute(
      FoodHttpMapper.toCreateCommand(request),
    );
    return FoodHttpMapper.toResponse(dto);
  }

  @Patch(':id')
  @ApiOperation({
    summary:
      'Modifie un aliment ; champ absent = inchangé, valeur nutritionnelle null = effacée, catégories fournies = remplacement',
  })
  @ApiOkResponse({ type: FoodResponseDto })
  @ApiProblemResponses(400, 404)
  async update(
    @Param() params: FoodIdParamDto,
    @Body() request: UpdateFoodRequestDto,
  ): Promise<FoodResponseDto> {
    const dto = await this.updateFood.execute(
      FoodHttpMapper.toUpdateCommand(params.id, request),
    );
    return FoodHttpMapper.toResponse(dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary:
      'Supprime un aliment ; refusé en 409 FOOD_IN_USE s’il est utilisé dans une recette',
  })
  @ApiNoContentResponse({ description: 'Aliment supprimé' })
  @ApiProblemResponses(400, 404, 409)
  async remove(@Param() params: FoodIdParamDto): Promise<void> {
    await this.deleteFood.execute({ id: params.id });
  }
}
