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
import { PlanningGenerationAccessDeniedError } from '../../domain/errors/planning-generation-access-denied.error.js';
import { PlanningGenerationUnavailableError } from '../../domain/errors/planning-generation-unavailable.error.js';
import type {
  IPlanningAiGenerator,
  PlanningGenerationInput,
} from '../../domain/ports/outbound/planning-ai-generator.port.js';
import type { PlannedSession } from '../../domain/value-objects/planned-session.vo.js';
import { ANTHROPIC_CLIENT } from '../../../../core/anthropic/anthropic-client.provider.js';
import {
  ClaudePlanningExternalMapper,
  type ClaudePlanningReply,
  PLANNING_OUTPUT_SCHEMA,
} from '../mappers/claude-planning.external-mapper.js';
import {
  PLANNING_PROMPT_VERSION,
  buildPlanningSystemPrompt,
  buildPlanningUserPrompt,
} from './prompts/planning-generation.prompt.v1.js';

@Injectable()
export class ClaudePlanningGeneratorAdapter implements IPlanningAiGenerator {
  private readonly logger = new Logger(ClaudePlanningGeneratorAdapter.name);

  constructor(
    @Inject(ANTHROPIC_CLIENT) private readonly client: Anthropic | null,
    @Inject(anthropicConfig.KEY) private readonly config: AnthropicConfig,
  ) {}

  /**
   * Un seul appel au modèle par génération. Le contenu envoyé ne contient que le temps libre, les séances existantes, les disciplines et l'objectif.
   *
   * @throws PlanningGenerationUnavailableError si aucune clé n'est configurée ou si le service est injoignable.
   * @throws PlanningGenerationAccessDeniedError si le service refuse l'authentification.
   * @throws PlanningInvalidOutputError si la réponse n'est pas exploitable.
   */
  async generate(input: PlanningGenerationInput): Promise<PlannedSession[]> {
    if (!this.client) {
      throw new PlanningGenerationUnavailableError();
    }
    const startedAt = Date.now();
    const reply = await this.requestPlanning(this.client, input, startedAt);
    const sessions = ClaudePlanningExternalMapper.toPlanned(reply);
    this.logger.log(
      `Planning généré (prompt ${PLANNING_PROMPT_VERSION}, modèle ${this.config.model}, ${sessions.length} séances, ${Date.now() - startedAt} ms)`,
    );
    return sessions;
  }

  private async requestPlanning(
    client: Anthropic,
    input: PlanningGenerationInput,
    startedAt: number,
  ): Promise<ClaudePlanningReply> {
    try {
      return await client.messages.create({
        model: this.config.model,
        max_tokens: this.config.maxTokens,
        system: buildPlanningSystemPrompt(),
        messages: [{ role: 'user', content: buildPlanningUserPrompt(input) }],
        output_config: {
          format: zodOutputFormat(PLANNING_OUTPUT_SCHEMA),
        },
      });
    } catch (error) {
      this.logFailure(error, startedAt);
      if (
        error instanceof AuthenticationError ||
        error instanceof PermissionDeniedError
      ) {
        throw new PlanningGenerationAccessDeniedError();
      }
      if (error instanceof AnthropicError) {
        throw new PlanningGenerationUnavailableError();
      }
      throw error;
    }
  }

  private logFailure(error: unknown, startedAt: number): void {
    const requestId = error instanceof APIError ? error.requestID : undefined;
    this.logger.warn(
      `Échec de l'appel au modèle (prompt ${PLANNING_PROMPT_VERSION}, modèle ${this.config.model}, ${Date.now() - startedAt} ms, classe ${error instanceof Error ? error.constructor.name : 'inconnue'}, requestID ${requestId ?? 'absent'})`,
    );
  }
}
