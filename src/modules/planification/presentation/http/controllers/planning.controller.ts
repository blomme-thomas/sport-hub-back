import { Body, Controller, Post } from '@nestjs/common';
import { ApiCreatedResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiProblemResponses } from '../../../../../core/filters/api-problem-responses.decorator.js';
import { GeneratePlanningUseCase } from '../../../application/use-cases/generate-planning.use-case.js';
import { GeneratePlanningRequestDto } from '../dtos/generate-planning.request.dto.js';
import { GeneratedPlanningResponseDto } from '../dtos/generated-planning.response.dto.js';

@ApiTags('planning')
@Controller('planning')
export class PlanningController {
  constructor(private readonly generatePlanning: GeneratePlanningUseCase) {}

  @Post('generate')
  @ApiOperation({
    summary:
      "Génère le planning d'une période, ou jusqu'à la date cible d'un objectif, et crée les séances dans les créneaux libres",
  })
  @ApiCreatedResponse({ type: GeneratedPlanningResponseDto })
  @ApiProblemResponses(400, 404, 502, 503)
  async generate(
    @Body() request: GeneratePlanningRequestDto,
  ): Promise<GeneratedPlanningResponseDto> {
    return this.generatePlanning.execute({
      from: request.from,
      to: request.to,
      goalId: request.goalId,
    });
  }
}
