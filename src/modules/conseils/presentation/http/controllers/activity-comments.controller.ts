import { Controller, Get, Param, Post } from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { ApiProblemResponses } from '../../../../../core/filters/api-problem-responses.decorator.js';
import { GenerateActivityCommentUseCase } from '../../../application/use-cases/generate-activity-comment.use-case.js';
import { GetActivityCommentUseCase } from '../../../application/use-cases/get-activity-comment.use-case.js';
import { ActivityIdParamDto } from '../dtos/activity-id.param.dto.js';
import { ActivityCommentResponseDto } from '../dtos/activity-comment.response.dto.js';

@ApiTags('conseils')
@Controller('activities')
export class ActivityCommentsController {
  constructor(
    private readonly generateComment: GenerateActivityCommentUseCase,
    private readonly getComment: GetActivityCommentUseCase,
  ) {}

  @Post(':id/comment')
  @ApiOperation({
    summary:
      "Génère le commentaire d'une activité, ou le régénère en remplaçant le précédent. Un seul appel au modèle ; sans séance rapprochée, commentaire générique sans appel",
  })
  @ApiCreatedResponse({ type: ActivityCommentResponseDto })
  @ApiProblemResponses(400, 404, 502, 503)
  async generate(
    @Param() params: ActivityIdParamDto,
  ): Promise<ActivityCommentResponseDto> {
    const dto = await this.generateComment.execute(params.id);
    return ActivityCommentResponseDto.fromDto(dto);
  }

  @Get(':id/comment')
  @ApiOperation({
    summary:
      'Renvoie le commentaire stocké de l’activité, sans appel au modèle',
  })
  @ApiOkResponse({ type: ActivityCommentResponseDto })
  @ApiProblemResponses(400, 404)
  async get(
    @Param() params: ActivityIdParamDto,
  ): Promise<ActivityCommentResponseDto> {
    const dto = await this.getComment.execute(params.id);
    return ActivityCommentResponseDto.fromDto(dto);
  }
}
