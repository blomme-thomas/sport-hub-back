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
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { ApiProblemResponses } from '../../../../../core/filters/api-problem-responses.decorator.js';
import { CreateRecipeUseCase } from '../../../application/use-cases/create-recipe.use-case.js';
import { DeleteRecipeUseCase } from '../../../application/use-cases/delete-recipe.use-case.js';
import { GetRecipeUseCase } from '../../../application/use-cases/get-recipe.use-case.js';
import { ListRecipesUseCase } from '../../../application/use-cases/list-recipes.use-case.js';
import { UpdateRecipeUseCase } from '../../../application/use-cases/update-recipe.use-case.js';
import {
  CreateRecipeRequestDto,
  UpdateRecipeRequestDto,
} from '../dtos/recipe.request.dto.js';
import { RecipeIdParamDto } from '../dtos/recipe-id.param.dto.js';
import { RecipeResponseDto } from '../dtos/recipe.response.dto.js';
import { RecipeHttpMapper } from '../mappers/recipe.http-mapper.js';

@ApiTags('aliments')
@Controller('recipes')
export class RecipesController {
  constructor(
    private readonly createRecipe: CreateRecipeUseCase,
    private readonly updateRecipe: UpdateRecipeUseCase,
    private readonly getRecipe: GetRecipeUseCase,
    private readonly listRecipes: ListRecipesUseCase,
    private readonly deleteRecipe: DeleteRecipeUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Liste les recettes, triées par nom' })
  @ApiOkResponse({ type: [RecipeResponseDto] })
  async list(): Promise<RecipeResponseDto[]> {
    const items = await this.listRecipes.execute();
    return items.map((item) => RecipeHttpMapper.toResponse(item));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Renvoie une recette avec sa composition' })
  @ApiOkResponse({ type: RecipeResponseDto })
  @ApiProblemResponses(400, 404)
  async get(@Param() params: RecipeIdParamDto): Promise<RecipeResponseDto> {
    const dto = await this.getRecipe.execute({ id: params.id });
    return RecipeHttpMapper.toResponse(dto);
  }

  @Post()
  @ApiOperation({
    summary:
      'Crée une recette avec un nom et au moins un tag de repas ; la composition est facultative',
  })
  @ApiCreatedResponse({ type: RecipeResponseDto })
  @ApiProblemResponses(400)
  async create(
    @Body() request: CreateRecipeRequestDto,
  ): Promise<RecipeResponseDto> {
    const dto = await this.createRecipe.execute(
      RecipeHttpMapper.toCreateCommand(request),
    );
    return RecipeHttpMapper.toResponse(dto);
  }

  @Patch(':id')
  @ApiOperation({
    summary:
      'Modifie une recette ; une composition fournie remplace l’ensemble des items',
  })
  @ApiOkResponse({ type: RecipeResponseDto })
  @ApiProblemResponses(400, 404)
  async update(
    @Param() params: RecipeIdParamDto,
    @Body() request: UpdateRecipeRequestDto,
  ): Promise<RecipeResponseDto> {
    const dto = await this.updateRecipe.execute(
      RecipeHttpMapper.toUpdateCommand(params.id, request),
    );
    return RecipeHttpMapper.toResponse(dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Supprime une recette et ses items' })
  @ApiNoContentResponse({ description: 'Recette supprimée' })
  @ApiProblemResponses(400, 404)
  async remove(@Param() params: RecipeIdParamDto): Promise<void> {
    await this.deleteRecipe.execute({ id: params.id });
  }
}
