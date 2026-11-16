import { Controller, Get, Param } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiProblemResponses } from '../../../../../core/filters/api-problem-responses.decorator.js';
import { ExportMonthUseCase } from '../../../application/use-cases/export-month.use-case.js';
import type { MonthExportDto } from '../../../application/month-export.builder.js';

@ApiTags('exports')
@Controller('exports')
export class MonthExportsController {
  constructor(private readonly exportMonth: ExportMonthUseCase) {}

  @Get('months/:month')
  @ApiProblemResponses(400)
  @ApiOperation({
    summary:
      "Bilan JSON d'un mois (AAAA-MM) pour analyse hors application : séances et activités du mois, regroupées par semaine ISO",
  })
  @ApiOkResponse({
    description:
      'Fichier bilan-mois, version 1 ; un mois sans données renvoie des listes vides',
  })
  async getMonth(@Param('month') month: string): Promise<MonthExportDto> {
    return this.exportMonth.execute(month);
  }
}
