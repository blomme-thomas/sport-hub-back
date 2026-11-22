import { Controller, Get, Header, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiProblemResponses } from '../../../../../core/filters/api-problem-responses.decorator.js';
import { ExportPlannedCalendarUseCase } from '../../../application/use-cases/export-planned-calendar.use-case.js';
import { ExportCalendarQueryDto } from '../dtos/export-calendar.query.dto.js';

@ApiTags('calendrier')
@Controller()
export class CalendarController {
  constructor(private readonly exportCalendar: ExportPlannedCalendarUseCase) {}

  @Get('calendar.ics')
  @Header('Content-Type', 'text/calendar; charset=utf-8')
  @ApiOperation({
    summary:
      'Exporte les séances planifiées d’une période au format ICS, en lecture seule',
  })
  @ApiOkResponse({
    description: 'Calendrier ICS (RFC 5545)',
    content: { 'text/calendar': { schema: { type: 'string' } } },
  })
  @ApiProblemResponses(400)
  async export(@Query() query: ExportCalendarQueryDto): Promise<string> {
    return this.exportCalendar.execute(query);
  }
}
