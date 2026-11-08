import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiProblemResponses } from '../../../../../core/filters/api-problem-responses.decorator.js';
import { GetGarminProfileUseCase } from '../../../application/use-cases/get-garmin-profile.use-case.js';
import { GarminProfileResponseDto } from '../dtos/garmin-profile.response.dto.js';

@ApiTags('garmin-sync')
@Controller('profile')
export class ProfileController {
  constructor(private readonly getGarminProfile: GetGarminProfileUseCase) {}

  @Get()
  @ApiProblemResponses(502, 503)
  @ApiOperation({
    summary: 'Nom affiché du compte Garmin courant',
  })
  @ApiOkResponse({
    type: GarminProfileResponseDto,
    description: 'Nom affiché, ou null si Garmin ne le fournit pas',
  })
  async get(): Promise<GarminProfileResponseDto> {
    return this.getGarminProfile.execute();
  }
}
