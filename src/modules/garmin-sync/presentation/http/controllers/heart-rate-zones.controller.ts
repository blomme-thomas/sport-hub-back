import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiProblemResponses } from '../../../../../core/filters/api-problem-responses.decorator.js';
import { GetHeartRateZonesUseCase } from '../../../application/use-cases/get-heart-rate-zones.use-case.js';
import { HeartRateZonesResponseDto } from '../dtos/heart-rate-zones.response.dto.js';

@ApiTags('garmin-sync')
@Controller('heart-rate-zones')
export class HeartRateZonesController {
  constructor(private readonly getHeartRateZones: GetHeartRateZonesUseCase) {}

  @Get()
  @ApiProblemResponses(502, 503)
  @ApiOperation({
    summary:
      'Seuils des zones cardiaques de l’utilisateur (sport par défaut), sans génération de zones par défaut côté Garmin',
  })
  @ApiOkResponse({
    type: HeartRateZonesResponseDto,
    description:
      'Seuils et méthode de calcul ; available à false et valeurs à null si aucune zone n’est configurée',
  })
  async get(): Promise<HeartRateZonesResponseDto> {
    return this.getHeartRateZones.execute();
  }
}
