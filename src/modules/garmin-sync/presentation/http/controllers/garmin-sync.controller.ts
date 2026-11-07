import { Controller, HttpCode, Post } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiProblemResponses } from '../../../../../core/filters/api-problem-responses.decorator.js';
import { SyncGarminActivitiesUseCase } from '../../../application/use-cases/sync-garmin-activities.use-case.js';
import { SyncGarminActivitiesResponseDto } from '../dtos/sync-garmin-activities.response.dto.js';

@ApiTags('garmin-sync')
@Controller('garmin-sync')
export class GarminSyncController {
  constructor(private readonly syncActivities: SyncGarminActivitiesUseCase) {}

  @Post('run')
  @HttpCode(200)
  @ApiProblemResponses(502, 503)
  @ApiOperation({
    summary: 'Synchronise les activités Garmin dans la base',
  })
  @ApiOkResponse({
    type: SyncGarminActivitiesResponseDto,
    description: 'Résumé de la synchronisation',
  })
  async run(): Promise<SyncGarminActivitiesResponseDto> {
    const result = await this.syncActivities.execute();
    return Object.assign(new SyncGarminActivitiesResponseDto(), result);
  }
}
