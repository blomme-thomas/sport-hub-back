import { Controller, Get, Post } from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { ApiProblemResponses } from '../../../../../core/filters/api-problem-responses.decorator.js';
import { GenerateDashboardAdviceUseCase } from '../../../application/use-cases/generate-dashboard-advice.use-case.js';
import { GetDashboardAdviceUseCase } from '../../../application/use-cases/get-dashboard-advice.use-case.js';
import { DashboardAdviceResponseDto } from '../dtos/dashboard-advice.response.dto.js';

@ApiTags('conseils')
@Controller('advice/dashboard')
export class DashboardAdviceController {
  constructor(
    private readonly generateAdvice: GenerateDashboardAdviceUseCase,
    private readonly getAdvice: GetDashboardAdviceUseCase,
  ) {}

  @Get()
  @ApiOperation({
    summary:
      'Renvoie le conseil du tableau de bord stocké pour la semaine ISO courante, sans appel au modèle',
  })
  @ApiOkResponse({ type: DashboardAdviceResponseDto })
  @ApiProblemResponses(404)
  async get(): Promise<DashboardAdviceResponseDto> {
    return DashboardAdviceResponseDto.fromDto(await this.getAdvice.execute());
  }

  @Post('regenerate')
  @ApiOperation({
    summary:
      'Génère le conseil du tableau de bord pour la semaine ISO courante, ou le régénère en remplaçant le précédent. Sans activité dans la semaine, conseil « données insuffisantes » sans appel au modèle',
  })
  @ApiCreatedResponse({ type: DashboardAdviceResponseDto })
  @ApiProblemResponses(502, 503)
  async regenerate(): Promise<DashboardAdviceResponseDto> {
    return DashboardAdviceResponseDto.fromDto(
      await this.generateAdvice.execute(),
    );
  }
}
