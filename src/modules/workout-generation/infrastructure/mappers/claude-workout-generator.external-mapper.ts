import { z } from 'zod';
import { GeneratedWorkout } from '../../domain/entities/generated-workout.entity.js';
import { InvalidGeneratedWorkoutError } from '../../domain/errors/invalid-generated-workout.error.js';
import {
  WORKOUT_INTENSITY_LEVELS,
  WorkoutIntensity,
} from '../../domain/value-objects/workout-intensity.vo.js';
import { WorkoutStep } from '../../domain/value-objects/workout-step.vo.js';

export const WORKOUT_OUTPUT_SCHEMA = z.object({
  title: z.string(),
  sport: z.string(),
  summary: z.string(),
  totalDurationMinutes: z.number().int(),
  steps: z.array(
    z.object({
      order: z.number().int(),
      label: z.string(),
      durationMinutes: z.number().int(),
      intensity: z.enum(WORKOUT_INTENSITY_LEVELS),
      notes: z.string().optional(),
    }),
  ),
});

export interface ClaudeReplyBlock {
  type: string;
  text?: string;
}

export interface ClaudeReply {
  stop_reason: string | null;
  content: readonly ClaudeReplyBlock[];
}

export class ClaudeWorkoutGeneratorExternalMapper {
  static toDomain(reply: ClaudeReply): GeneratedWorkout {
    if (reply.stop_reason !== 'end_turn') {
      throw new InvalidGeneratedWorkoutError(
        'La réponse du modèle est incomplète ou refusée.',
      );
    }
    const [block, ...rest] = reply.content;
    if (
      block === undefined ||
      rest.length > 0 ||
      block.type !== 'text' ||
      typeof block.text !== 'string'
    ) {
      throw new InvalidGeneratedWorkoutError(
        'La réponse du modèle ne contient pas un unique bloc texte.',
      );
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(block.text);
    } catch {
      throw new InvalidGeneratedWorkoutError(
        "La réponse du modèle n'est pas un JSON valide.",
      );
    }

    const result = WORKOUT_OUTPUT_SCHEMA.safeParse(parsed);
    if (!result.success) {
      throw new InvalidGeneratedWorkoutError(
        'La séance générée ne respecte pas le format attendu.',
      );
    }
    const data = result.data;

    return GeneratedWorkout.create({
      title: data.title,
      sport: data.sport,
      summary: data.summary,
      totalDurationMinutes: data.totalDurationMinutes,
      steps: data.steps.map((step) =>
        WorkoutStep.create({
          order: step.order,
          label: step.label,
          durationMinutes: step.durationMinutes,
          intensity: WorkoutIntensity.create(step.intensity),
          notes: step.notes ?? null,
        }),
      ),
    });
  }
}
