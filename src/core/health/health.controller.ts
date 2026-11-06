import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiProblemResponses } from '../filters/api-problem-responses.decorator.js';
import { DependencyUnavailableException } from '../filters/dependency-unavailable.exception.js';
import { DatabaseHealthIndicator } from './database.health-indicator.js';
import { HealthResponseDto } from './health-response.dto.js';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly database: DatabaseHealthIndicator) {}

  @Get()
  @ApiProblemResponses(503)
  @ApiOperation({
    summary: 'Vérifie que le service tourne et que la base répond',
  })
  @ApiOkResponse({
    type: HealthResponseDto,
    description: 'Le service et la base répondent',
  })
  async check(): Promise<HealthResponseDto> {
    const database = await this.database.check();
    if (database === 'down') {
      throw new DependencyUnavailableException({ database });
    }
    return { status: 'ok', checks: { database } };
  }
}
