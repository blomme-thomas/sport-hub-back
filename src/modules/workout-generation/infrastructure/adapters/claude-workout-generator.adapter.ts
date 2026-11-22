import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  AnthropicError,
  APIError,
  AuthenticationError,
  PermissionDeniedError,
  type Anthropic,
} from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import anthropicConfig, {
  type AnthropicConfig,
} from '../../../../core/config/anthropic/anthropic.config.js';
import type { GeneratedWorkout } from '../../domain/entities/generated-workout.entity.js';
import { WorkoutGenerationAccessDeniedError } from '../../domain/errors/workout-generation-access-denied.error.js';
import { WorkoutGenerationUnavailableError } from '../../domain/errors/workout-generation-unavailable.error.js';
import {
  type GenerateWorkoutInput,
  type IWorkoutAiGenerator,
} from '../../domain/ports/outbound/workout-ai-generator.port.js';
import {
  ClaudeWorkoutGeneratorExternalMapper,
  WORKOUT_OUTPUT_SCHEMA,
  type ClaudeReply,
} from '../mappers/claude-workout-generator.external-mapper.js';
import { ANTHROPIC_CLIENT } from '../../../../core/anthropic/anthropic-client.provider.js';
import {
  WORKOUT_PROMPT_VERSION,
  buildSystemPrompt,
  buildUserPrompt,
} from './prompts/workout-generation.prompt.v1.js';

@Injectable()
export class ClaudeWorkoutGeneratorAdapter implements IWorkoutAiGenerator {
  private readonly logger = new Logger(ClaudeWorkoutGeneratorAdapter.name);

  constructor(
    @Inject(ANTHROPIC_CLIENT) private readonly client: Anthropic | null,
    @Inject(anthropicConfig.KEY) private readonly config: AnthropicConfig,
  ) {}

  async generate(input: GenerateWorkoutInput): Promise<GeneratedWorkout> {
    if (!this.client) {
      throw new WorkoutGenerationUnavailableError();
    }
    const startedAt = Date.now();
    const reply = await this.requestWorkout(this.client, input, startedAt);

    let workout: GeneratedWorkout;
    try {
      workout = ClaudeWorkoutGeneratorExternalMapper.toDomain(reply);
    } catch (error) {
      this.logger.warn(
        `Sortie du modèle inexploitable (prompt ${WORKOUT_PROMPT_VERSION}, modèle ${this.config.model}, ${Date.now() - startedAt} ms, classe ${ClaudeWorkoutGeneratorAdapter.nameOf(error)})`,
      );
      throw error;
    }
    this.logger.log(
      `Séance générée (prompt ${WORKOUT_PROMPT_VERSION}, modèle ${this.config.model}, ${Date.now() - startedAt} ms)`,
    );
    return workout;
  }

  private async requestWorkout(
    client: Anthropic,
    input: GenerateWorkoutInput,
    startedAt: number,
  ): Promise<ClaudeReply> {
    try {
      return await client.messages.create({
        model: this.config.model,
        max_tokens: this.config.maxTokens,
        system: buildSystemPrompt(),
        messages: [{ role: 'user', content: buildUserPrompt(input) }],
        output_config: {
          format: zodOutputFormat(WORKOUT_OUTPUT_SCHEMA),
        },
      });
    } catch (error) {
      this.logFailure(error, startedAt);
      if (
        error instanceof AuthenticationError ||
        error instanceof PermissionDeniedError
      ) {
        throw new WorkoutGenerationAccessDeniedError();
      }
      if (error instanceof AnthropicError) {
        throw new WorkoutGenerationUnavailableError();
      }
      throw error;
    }
  }

  private logFailure(error: unknown, startedAt: number): void {
    const requestId = error instanceof APIError ? error.requestID : undefined;
    this.logger.warn(
      `Échec de l'appel au modèle (prompt ${WORKOUT_PROMPT_VERSION}, modèle ${this.config.model}, ${Date.now() - startedAt} ms, classe ${ClaudeWorkoutGeneratorAdapter.nameOf(error)}, requestID ${requestId ?? 'absent'})`,
    );
  }

  private static nameOf(error: unknown): string {
    return error instanceof Error ? error.constructor.name : 'inconnue';
  }
}
