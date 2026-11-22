import { Controller, Get, Param } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiProblemResponses } from '../../../../../core/filters/api-problem-responses.decorator.js';
import { ExportSessionUseCase } from '../../../application/use-cases/export-session.use-case.js';
import type { SessionExportDto } from '../../../application/session-export.builder.js';
import { SessionExportParamDto } from '../dtos/session-export.param.dto.js';

@ApiTags('exports')
@Controller('exports')
export class SessionExportsController {
  constructor(private readonly exportSession: ExportSessionUseCase) {}

  @Get('sessions/:id')
  @ApiProblemResponses(400, 404)
  @ApiOperation({
    summary:
      "Bilan JSON d'une séance planifiée avec son activité réalisée rapprochée, pour analyse hors application : plan, réalisé et atteinte",
  })
  @ApiOkResponse({
    description:
      'Fichier bilan-seance, version 1 ; une séance sans activité rapprochée renvoie un réalisé et une atteinte à null',
  })
  async getSession(
    @Param() params: SessionExportParamDto,
  ): Promise<SessionExportDto> {
    return this.exportSession.execute(params.id);
  }
}
