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
import { ActivityCommentAccessDeniedError } from '../../domain/errors/activity-comment-access-denied.error.js';
import { ActivityCommentInvalidOutputError } from '../../domain/errors/activity-comment-invalid-output.error.js';
import { ActivityCommentUnavailableError } from '../../domain/errors/activity-comment-unavailable.error.js';
import type {
  CommentGenerationInput,
  GeneratedComment,
  IActivityCommentGenerator,
} from '../../domain/ports/outbound/conseils.ports.js';
import {
  COMMENT_PROMPT_VERSION,
  buildCommentSystemPrompt,
  buildCommentUserPrompt,
} from './prompts/activity-comment.prompt.v1.js';

interface CommentReply {
  stop_reason: string | null;
  content: readonly { type: string; text?: string }[];
}

@Injectable()
export class ClaudeActivityCommentGeneratorAdapter implements IActivityCommentGenerator {
  private readonly logger = new Logger(
    ClaudeActivityCommentGeneratorAdapter.name,
  );

  constructor(
    @Inject(ANTHROPIC_CLIENT) private readonly client: Anthropic | null,
    @Inject(anthropicConfig.KEY) private readonly config: AnthropicConfig,
  ) {}

  /**
   * Un seul appel au modèle. Le contenu envoyé ne contient que le type, la date, la durée et la distance de l'activité, et la séance prévue.
   *
   * @throws ActivityCommentUnavailableError si aucune clé n'est configurée ou si le service est injoignable.
   * @throws ActivityCommentAccessDeniedError si le service refuse l'authentification.
   * @throws ActivityCommentInvalidOutputError si la réponse n'est pas un texte complet et unique.
   */
  async generate(input: CommentGenerationInput): Promise<GeneratedComment> {
    if (!this.client) {
      throw new ActivityCommentUnavailableError();
    }
    const startedAt = Date.now();
    const reply = await this.request(this.client, input, startedAt);
    if (reply.stop_reason !== 'end_turn') {
      throw new ActivityCommentInvalidOutputError('réponse tronquée');
    }
    const [block, ...rest] = reply.content;
    if (
      rest.length > 0 ||
      block?.type !== 'text' ||
      typeof block.text !== 'string'
    ) {
      throw new ActivityCommentInvalidOutputError('bloc de réponse inattendu');
    }
    this.logger.log(
      `Commentaire généré (prompt ${COMMENT_PROMPT_VERSION}, modèle ${this.config.model}, ${Date.now() - startedAt} ms)`,
    );
    return { text: block.text, model: this.config.model };
  }

  private async request(
    client: Anthropic,
    input: CommentGenerationInput,
    startedAt: number,
  ): Promise<CommentReply> {
    try {
      return await client.messages.create({
        model: this.config.model,
        max_tokens: this.config.maxTokens,
        system: buildCommentSystemPrompt(),
        messages: [{ role: 'user', content: buildCommentUserPrompt(input) }],
      });
    } catch (error) {
      const requestId = error instanceof APIError ? error.requestID : undefined;
      this.logger.warn(
        `Échec de l'appel au modèle (prompt ${COMMENT_PROMPT_VERSION}, modèle ${this.config.model}, ${Date.now() - startedAt} ms, requestID ${requestId ?? 'absent'})`,
      );
      if (
        error instanceof AuthenticationError ||
        error instanceof PermissionDeniedError
      ) {
        throw new ActivityCommentAccessDeniedError();
      }
      if (error instanceof AnthropicError) {
        throw new ActivityCommentUnavailableError();
      }
      throw error;
    }
  }
}
