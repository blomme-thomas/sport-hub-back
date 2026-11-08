import { Controller, Get, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiProblemResponses } from '../../../../../core/filters/api-problem-responses.decorator.js';
import { GetRecoveryUseCase } from '../../../application/use-cases/get-recovery.use-case.js';
import { GetRecoveryRequestDto } from '../dtos/get-recovery.request.dto.js';
import { RecoveryResponseDto } from '../dtos/recovery.response.dto.js';

@ApiTags('garmin-sync')
@Controller('recovery')
export class RecoveryController {
  constructor(private readonly getRecovery: GetRecoveryUseCase) {}

  @Get()
  @ApiProblemResponses(400, 502, 503)
  @ApiOperation({
    summary:
      'Données de récupération journalières (sommeil, HRV, Body Battery, fréquence cardiaque de repos) sur une plage de 31 jours au plus',
  })
  @ApiOkResponse({
    type: RecoveryResponseDto,
    description:
      'Un élément par jour de la plage ; un indicateur sans donnée Garmin vaut null',
  })
  async get(
    @Query() request: GetRecoveryRequestDto,
  ): Promise<RecoveryResponseDto> {
    const days = await this.getRecovery.execute({
      from: request.from,
      to: request.to,
    });
    return { from: request.from, to: request.to, days: [...days] };
  }
}
