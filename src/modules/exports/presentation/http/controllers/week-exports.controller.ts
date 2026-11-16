import { Controller, Get, Param } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiProblemResponses } from '../../../../../core/filters/api-problem-responses.decorator.js';
import type { WeekExportDto } from '../../../application/week-export.builder.js';
import { ExportWeekUseCase } from '../../../application/use-cases/export-week.use-case.js';

@ApiTags('exports')
@Controller('exports')
export class WeekExportsController {
  constructor(private readonly exportWeek: ExportWeekUseCase) {}

  @Get('weeks/:week')
  @ApiProblemResponses(400)
  @ApiOperation({
    summary:
      "Bilan JSON d'une semaine ISO (AAAA-Www) pour analyse hors application : séances avec plan et réalisé, activités non planifiées et totaux comparés à la semaine précédente",
  })
  @ApiOkResponse({
    description:
      'Fichier bilan-semaine, version 1, lisible sans contexte supplémentaire ; une semaine sans données renvoie des listes vides',
  })
  async getWeek(@Param('week') week: string): Promise<WeekExportDto> {
    return this.exportWeek.execute(week);
  }
}
