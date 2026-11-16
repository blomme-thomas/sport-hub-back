import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
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
import { CreateGoalUseCase } from '../../../application/use-cases/create-goal.use-case.js';
import { DeleteGoalUseCase } from '../../../application/use-cases/delete-goal.use-case.js';
import { GetGoalUseCase } from '../../../application/use-cases/get-goal.use-case.js';
import { ListGoalsUseCase } from '../../../application/use-cases/list-goals.use-case.js';
import { UpdateGoalUseCase } from '../../../application/use-cases/update-goal.use-case.js';
import { CreateGoalRequestDto } from '../dtos/create-goal.request.dto.js';
import { GoalIdParamDto } from '../dtos/goal-id.param.dto.js';
import { GoalListResponseDto } from '../dtos/goal-list.response.dto.js';
import { GoalResponseDto } from '../dtos/goal.response.dto.js';
import { ListGoalsRequestDto } from '../dtos/list-goals.request.dto.js';
import { UpdateGoalRequestDto } from '../dtos/update-goal.request.dto.js';
import { GoalHttpMapper } from '../mappers/goal.http-mapper.js';

@ApiTags('objectifs')
@Controller('goals')
export class GoalsController {
  constructor(
    private readonly createGoal: CreateGoalUseCase,
    private readonly listGoals: ListGoalsUseCase,
    private readonly getGoal: GetGoalUseCase,
    private readonly updateGoal: UpdateGoalUseCase,
    private readonly deleteGoal: DeleteGoalUseCase,
  ) {}

  @Post()
  @ApiOperation({
    summary:
      'Crée un objectif : événement avec format et temps cible, volume ou régularité',
  })
  @ApiCreatedResponse({ type: GoalResponseDto })
  @ApiProblemResponses(400)
  async create(
    @Body() request: CreateGoalRequestDto,
  ): Promise<GoalResponseDto> {
    const dto = await this.createGoal.execute(
      GoalHttpMapper.toCreateCommand(request),
    );
    return GoalHttpMapper.toResponse(dto);
  }

  @Get()
  @ApiOperation({
    summary:
      'Liste les objectifs par date cible croissante ; upcoming=true ne garde que les objectifs à venir',
  })
  @ApiOkResponse({ type: GoalListResponseDto })
  @ApiProblemResponses(400)
  async list(
    @Query() request: ListGoalsRequestDto,
  ): Promise<GoalListResponseDto> {
    const dtos = await this.listGoals.execute(
      GoalHttpMapper.toListQuery(request),
    );
    return GoalHttpMapper.toListResponse(dtos);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Renvoie un objectif' })
  @ApiOkResponse({ type: GoalResponseDto })
  @ApiProblemResponses(400, 404)
  async get(@Param() params: GoalIdParamDto): Promise<GoalResponseDto> {
    const dto = await this.getGoal.execute(params.id);
    return GoalHttpMapper.toResponse(dto);
  }

  @Patch(':id')
  @ApiOperation({
    summary:
      'Modifie un objectif ; les champs absents sont inchangés, null efface format, temps cible ou date',
  })
  @ApiOkResponse({ type: GoalResponseDto })
  @ApiProblemResponses(400, 404)
  async update(
    @Param() params: GoalIdParamDto,
    @Body() request: UpdateGoalRequestDto,
  ): Promise<GoalResponseDto> {
    const dto = await this.updateGoal.execute(
      GoalHttpMapper.toUpdateCommand(params.id, request),
    );
    return GoalHttpMapper.toResponse(dto);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Supprime un objectif' })
  @ApiNoContentResponse({ description: 'Objectif supprimé' })
  @ApiProblemResponses(400, 404)
  async remove(@Param() params: GoalIdParamDto): Promise<void> {
    await this.deleteGoal.execute(params.id);
  }
}
