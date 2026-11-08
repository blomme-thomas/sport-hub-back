import { Controller, Get, Param, Post } from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { ApiProblemResponses } from '../../../../../core/filters/api-problem-responses.decorator.js';
import { GenerateWeeklyReviewUseCase } from '../../../application/use-cases/generate-weekly-review.use-case.js';
import { GetWeeklyReviewUseCase } from '../../../application/use-cases/get-weekly-review.use-case.js';
import { WeeklyReviewParamDto } from '../dtos/weekly-review.param.dto.js';
import { WeeklyReviewResponseDto } from '../dtos/weekly-review.response.dto.js';

@ApiTags('conseils')
@Controller('weekly-reviews')
export class WeeklyReviewsController {
  constructor(
    private readonly generateReview: GenerateWeeklyReviewUseCase,
    private readonly getReview: GetWeeklyReviewUseCase,
  ) {}

  @Get(':week')
  @ApiOperation({
    summary:
      'Renvoie le bilan stocké de la semaine ISO (AAAA-Www), sans appel au modèle',
  })
  @ApiOkResponse({ type: WeeklyReviewResponseDto })
  @ApiProblemResponses(400, 404)
  async get(
    @Param() params: WeeklyReviewParamDto,
  ): Promise<WeeklyReviewResponseDto> {
    const dto = await this.getReview.execute(params.week);
    return WeeklyReviewResponseDto.fromDto(dto);
  }

  @Post(':week')
  @ApiOperation({
    summary:
      'Génère le bilan de la semaine ISO (AAAA-Www), ou le régénère en remplaçant le précédent. Un seul appel au modèle ; sans séance prévue, bilan générique sans appel',
  })
  @ApiCreatedResponse({ type: WeeklyReviewResponseDto })
  @ApiProblemResponses(400, 502, 503)
  async generate(
    @Param() params: WeeklyReviewParamDto,
  ): Promise<WeeklyReviewResponseDto> {
    const dto = await this.generateReview.execute(params.week);
    return WeeklyReviewResponseDto.fromDto(dto);
  }
}
