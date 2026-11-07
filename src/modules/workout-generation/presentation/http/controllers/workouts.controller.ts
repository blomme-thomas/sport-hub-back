import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiProblemResponses } from '../../../../../core/filters/api-problem-responses.decorator.js';
import { GenerateWorkoutUseCase } from '../../../application/use-cases/generate-workout.use-case.js';
import { GenerateWorkoutRequestDto } from '../dtos/generate-workout.request.dto.js';
import { GeneratedWorkoutResponseDto } from '../dtos/generated-workout.response.dto.js';
import { WorkoutHttpMapper } from '../mappers/workout.http-mapper.js';

@ApiTags('workouts')
@Controller('workouts')
export class WorkoutsController {
  constructor(private readonly generateWorkout: GenerateWorkoutUseCase) {}

  @Post('generate')
  @HttpCode(200)
  @ApiProblemResponses(400, 502, 503)
  @ApiOperation({
    summary:
      "Génère une séance d'entraînement à partir des statistiques récentes, sans la persister",
  })
  @ApiOkResponse({
    type: GeneratedWorkoutResponseDto,
    description: 'Séance générée et validée, fenêtre de statistiques utilisée',
  })
  async generate(
    @Body() request: GenerateWorkoutRequestDto,
  ): Promise<GeneratedWorkoutResponseDto> {
    const workout = await this.generateWorkout.execute(
      WorkoutHttpMapper.toCommand(request),
    );
    return WorkoutHttpMapper.toResponse(workout);
  }
}
