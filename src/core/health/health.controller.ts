import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { HealthResponseDto } from './health-response.dto.js';

@ApiTags('health')
@Controller('health')
export class HealthController {
  @Get()
  @ApiOperation({ summary: 'Vérifie que le service tourne' })
  @ApiOkResponse({ type: HealthResponseDto, description: 'Le service répond' })
  check(): HealthResponseDto {
    return { status: 'ok' };
  }
}
