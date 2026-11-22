import type {
  GenerateWorkoutCommand,
  GeneratedWorkoutDto,
} from '../../../application/dtos/generate-workout.dto.js';
import type { GenerateWorkoutRequestDto } from '../dtos/generate-workout.request.dto.js';
import {
  GeneratedWorkoutResponseDto,
  GeneratedWorkoutStepResponseDto,
  WorkoutBasedOnResponseDto,
} from '../dtos/generated-workout.response.dto.js';

export class WorkoutHttpMapper {
  static toCommand(request: GenerateWorkoutRequestDto): GenerateWorkoutCommand {
    return {
      sport: request.sport ?? null,
      goal: request.goal ?? null,
      durationMinutes: request.durationMinutes ?? null,
      weeks: request.weeks,
    };
  }

  static toResponse(dto: GeneratedWorkoutDto): GeneratedWorkoutResponseDto {
    return Object.assign(new GeneratedWorkoutResponseDto(), {
      title: dto.title,
      sport: dto.sport,
      summary: dto.summary,
      totalDurationMinutes: dto.totalDurationMinutes,
      steps: dto.steps.map((step) =>
        Object.assign(new GeneratedWorkoutStepResponseDto(), {
          order: step.order,
          label: step.label,
          durationMinutes: step.durationMinutes,
          intensity: step.intensity,
          notes: step.notes,
        }),
      ),
      basedOn: Object.assign(new WorkoutBasedOnResponseDto(), {
        weeks: dto.basedOn.weeks,
        from: WorkoutHttpMapper.toCalendarDate(dto.basedOn.from),
        to: WorkoutHttpMapper.toCalendarDate(dto.basedOn.to),
      }),
    });
  }

  private static toCalendarDate(date: Date | null): string | null {
    return date ? date.toISOString().slice(0, 10) : null;
  }
}
