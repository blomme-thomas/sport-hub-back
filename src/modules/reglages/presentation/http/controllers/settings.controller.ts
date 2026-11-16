import { Body, Controller, Get, Param, Put } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiProblemResponses } from '../../../../../core/filters/api-problem-responses.decorator.js';
import { GetWeeklyTargetProgressUseCase } from '../../../application/use-cases/get-weekly-target-progress.use-case.js';
import {
  GetUserSettingsUseCase,
  UpdateUserSettingsUseCase,
} from '../../../application/use-cases/user-settings.use-cases.js';
import {
  UpdateUserSettingsRequestDto,
  UserSettingsResponseDto,
  WeeklyTargetProgressResponseDto,
} from '../dtos/user-settings.dto.js';

@ApiTags('reglages')
@Controller('settings')
export class SettingsController {
  constructor(
    private readonly getSettings: GetUserSettingsUseCase,
    private readonly updateSettings: UpdateUserSettingsUseCase,
    private readonly getWeeklyTargetProgress: GetWeeklyTargetProgressUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Lit les réglages (cible hebdomadaire)' })
  @ApiOkResponse({ type: UserSettingsResponseDto })
  async get(): Promise<UserSettingsResponseDto> {
    return this.getSettings.execute();
  }

  @Put()
  @ApiOperation({
    summary:
      'Enregistre la cible hebdomadaire ; null la retire. Elle reste la même tant qu’elle n’est pas modifiée',
  })
  @ApiOkResponse({ type: UserSettingsResponseDto })
  @ApiProblemResponses(400)
  async update(
    @Body() request: UpdateUserSettingsRequestDto,
  ): Promise<UserSettingsResponseDto> {
    return this.updateSettings.execute(request.weeklyTargetSeconds);
  }

  @Get('weekly-target/:week')
  @ApiOperation({
    summary:
      'Cible hebdomadaire et durée réalisée de la semaine ISO (AAAA-Www), avec l’historique des huit dernières semaines',
  })
  @ApiOkResponse({ type: WeeklyTargetProgressResponseDto })
  @ApiProblemResponses(400)
  async weeklyTarget(
    @Param('week') week: string,
  ): Promise<WeeklyTargetProgressResponseDto> {
    return this.getWeeklyTargetProgress.execute(week);
  }
}
