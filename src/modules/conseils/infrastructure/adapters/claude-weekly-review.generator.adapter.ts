import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  AnthropicError,
  APIError,
  AuthenticationError,
  PermissionDeniedError,
  type Anthropic,
} from '@anthropic-ai/sdk';
import anthropicConfig, {
  type AnthropicConfig,
} from '../../../../core/config/anthropic/anthropic.config.js';
import { ANTHROPIC_CLIENT } from '../../../../core/anthropic/anthropic-client.provider.js';
import { WeeklyReviewAccessDeniedError } from '../../domain/errors/weekly-review-access-denied.error.js';
import { WeeklyReviewInvalidOutputError } from '../../domain/errors/weekly-review-invalid-output.error.js';
import { WeeklyReviewUnavailableError } from '../../domain/errors/weekly-review-unavailable.error.js';
import type {
  GeneratedWeeklyReview,
  IWeeklyReviewGenerator,
  WeeklyReviewInput,
} from '../../domain/ports/outbound/weekly-review.ports.js';
import { WeeklyReviewExternalMapper } from '../mappers/weekly-review.external-mapper.js';
import {
  WEEKLY_REVIEW_PROMPT_VERSION,
  buildWeeklyReviewSystemPrompt,
  buildWeeklyReviewUserPrompt,
} from './prompts/weekly-review.prompt.v1.js';

interface WeeklyReviewReply {
  stop_reason: string | null;
  content: readonly { type: string; text?: string }[];
}

@Injectable()
export class ClaudeWeeklyReviewGeneratorAdapter implements IWeeklyReviewGenerator {
  private readonly logger = new Logger(ClaudeWeeklyReviewGeneratorAdapter.name);

  constructor(
    @Inject(ANTHROPIC_CLIENT) private readonly client: Anthropic | null,
    @Inject(anthropicConfig.KEY) private readonly config: AnthropicConfig,
  ) {}

  /**
   * Un seul appel au modèle, avec le prévu de la semaine et les volumes de la semaine et de la précédente.
   *
   * @throws WeeklyReviewUnavailableError si aucune clé n'est configurée ou si le service est injoignable.
   * @throws WeeklyReviewAccessDeniedError si le service refuse l'authentification.
   * @throws WeeklyReviewInvalidOutputError si la réponse n'est pas un texte complet et unique au format attendu.
   */
  async generate(input: WeeklyReviewInput): Promise<GeneratedWeeklyReview> {
    if (!this.client) {
      throw new WeeklyReviewUnavailableError();
    }
    const startedAt = Date.now();
    const reply = await this.request(this.client, input, startedAt);
    if (reply.stop_reason !== 'end_turn') {
      throw new WeeklyReviewInvalidOutputError('réponse tronquée');
    }
    const [block, ...rest] = reply.content;
    if (
      rest.length > 0 ||
      block?.type !== 'text' ||
      typeof block.text !== 'string'
    ) {
      throw new WeeklyReviewInvalidOutputError('bloc de réponse inattendu');
    }
    const generated = WeeklyReviewExternalMapper.toGenerated(
      block.text,
      this.config.model,
    );
    this.logger.log(
      `Bilan généré (prompt ${WEEKLY_REVIEW_PROMPT_VERSION}, modèle ${this.config.model}, ${Date.now() - startedAt} ms)`,
    );
    return generated;
  }

  private async request(
    client: Anthropic,
    input: WeeklyReviewInput,
    startedAt: number,
  ): Promise<WeeklyReviewReply> {
    try {
      return await client.messages.create({
        model: this.config.model,
        max_tokens: this.config.maxTokens,
        system: buildWeeklyReviewSystemPrompt(),
        messages: [
          { role: 'user', content: buildWeeklyReviewUserPrompt(input) },
        ],
      });
    } catch (error) {
      const requestId = error instanceof APIError ? error.requestID : undefined;
      this.logger.warn(
        `Échec de l'appel au modèle (prompt ${WEEKLY_REVIEW_PROMPT_VERSION}, modèle ${this.config.model}, ${Date.now() - startedAt} ms, requestID ${requestId ?? 'absent'})`,
      );
      if (
        error instanceof AuthenticationError ||
        error instanceof PermissionDeniedError
      ) {
        throw new WeeklyReviewAccessDeniedError();
      }
      if (error instanceof AnthropicError) {
        throw new WeeklyReviewUnavailableError();
      }
      throw error;
    }
  }
}
