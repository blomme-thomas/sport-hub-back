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
import { CreateRecipeUseCase } from '../../../application/use-cases/create-recipe.use-case.js';
import { ImportRecipesUseCase } from '../../../application/use-cases/import-recipes.use-case.js';
import { AlimentsImportHttpMapper } from '../mappers/aliments-import.http-mapper.js';
import { AlimentsImportResponseDto } from '../dtos/aliments-import.response.dto.js';
import { DeleteRecipeUseCase } from '../../../application/use-cases/delete-recipe.use-case.js';
import { GetRecipeUseCase } from '../../../application/use-cases/get-recipe.use-case.js';
import { ListRecipesUseCase } from '../../../application/use-cases/list-recipes.use-case.js';
import { PreviewRecipeNutritionUseCase } from '../../../application/use-cases/preview-recipe-nutrition.use-case.js';
import { UpdateRecipeUseCase } from '../../../application/use-cases/update-recipe.use-case.js';
import {
  CreateRecipeRequestDto,
  PreviewRecipeNutritionRequestDto,
  UpdateRecipeRequestDto,
} from '../dtos/recipe.request.dto.js';
import { DeleteRecipeQueryDto } from '../dtos/recipe-delete.query.dto.js';
import { RecipeIdParamDto } from '../dtos/recipe-id.param.dto.js';
import {
  RecipeDetailResponseDto,
  RecipeNutritionResponseDto,
} from '../dtos/recipe-detail.response.dto.js';
import { RecipeResponseDto } from '../dtos/recipe.response.dto.js';
import {
  RecipeHttpMapper,
  toItemCommands,
  toNutritionResponse,
} from '../mappers/recipe.http-mapper.js';

@ApiTags('aliments')
@Controller('recipes')
export class RecipesController {
  constructor(
    private readonly createRecipe: CreateRecipeUseCase,
    private readonly updateRecipe: UpdateRecipeUseCase,
    private readonly getRecipe: GetRecipeUseCase,
    private readonly listRecipes: ListRecipesUseCase,
    private readonly deleteRecipe: DeleteRecipeUseCase,
    private readonly previewRecipeNutrition: PreviewRecipeNutritionUseCase,
    private readonly importRecipes: ImportRecipesUseCase,
  ) {}

  @Post('import')
  @ApiOperation({
    summary:
      'Importe un fichier plan-recettes (ou un tableau brut de recettes) : toutes les recettes sont créées, ou aucune. Chaque item désigne son aliment par son nom, qui doit correspondre à un seul aliment existant. Un nom déjà existant fait refuser le fichier (409)',
  })
  @ApiBody({
    description: 'Fichier plan-recettes, ou tableau brut de recettes',
    schema: { type: 'object' },
  })
  @ApiCreatedResponse({ type: AlimentsImportResponseDto })
  @ApiProblemResponses(400, 409)
  async importRecipesFile(
    @Body() body: unknown,
  ): Promise<AlimentsImportResponseDto> {
    const dto = await this.importRecipes.execute(body);
    return AlimentsImportHttpMapper.toResponse(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Liste les recettes, triées par nom' })
  @ApiOkResponse({ type: [RecipeResponseDto] })
  async list(): Promise<RecipeResponseDto[]> {
    const items = await this.listRecipes.execute();
    return items.map((item) => RecipeHttpMapper.toResponse(item));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Renvoie une recette avec sa composition' })
  @ApiOkResponse({ type: RecipeDetailResponseDto })
  @ApiProblemResponses(400, 404)
  async get(
    @Param() params: RecipeIdParamDto,
  ): Promise<RecipeDetailResponseDto> {
    const dto = await this.getRecipe.execute({ id: params.id });
    return RecipeHttpMapper.toDetailResponse(dto);
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

  @Post('preview')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Calcule la synthèse nutritionnelle d’une composition sans rien enregistrer (aperçu en direct)',
  })
  @ApiOkResponse({ type: RecipeNutritionResponseDto })
  @ApiProblemResponses(400)
  async preview(
    @Body() request: PreviewRecipeNutritionRequestDto,
  ): Promise<RecipeNutritionResponseDto> {
    const summary = await this.previewRecipeNutrition.execute({
      items: toItemCommands(request.items) ?? [],
    });
    return toNutritionResponse(summary);
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
  @ApiProblemResponses(400, 404, 409)
  @ApiOperation({
    summary:
      'Supprime une recette ; si elle est planifiée, confirm=true est requis et retire aussi ces repas',
  })
  async remove(
    @Param() params: RecipeIdParamDto,
    @Query() query: DeleteRecipeQueryDto,
  ): Promise<void> {
    await this.deleteRecipe.execute({
      id: params.id,
      confirm: query.confirm === 'true',
    });
  }
}
