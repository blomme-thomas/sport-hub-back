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
import { DashboardAdviceAccessDeniedError } from '../../domain/errors/dashboard-advice-access-denied.error.js';
import { DashboardAdviceInvalidOutputError } from '../../domain/errors/dashboard-advice-invalid-output.error.js';
import { DashboardAdviceUnavailableError } from '../../domain/errors/dashboard-advice-unavailable.error.js';
import type {
  DashboardAdviceData,
  GeneratedDashboardAdvice,
  IDashboardAdviceGenerator,
} from '../../domain/ports/outbound/dashboard-advice.ports.js';
import {
  DASHBOARD_ADVICE_PROMPT_VERSION,
  buildDashboardAdviceSystemPrompt,
  buildDashboardAdviceUserPrompt,
} from './prompts/dashboard-advice.prompt.v1.js';

interface DashboardAdviceReply {
  stop_reason: string | null;
  content: readonly { type: string; text?: string }[];
}

@Injectable()
export class ClaudeDashboardAdviceGeneratorAdapter implements IDashboardAdviceGenerator {
  private readonly logger = new Logger(
    ClaudeDashboardAdviceGeneratorAdapter.name,
  );

  constructor(
    @Inject(ANTHROPIC_CLIENT) private readonly client: Anthropic | null,
    @Inject(anthropicConfig.KEY) private readonly config: AnthropicConfig,
  ) {}

  /**
   * Un seul appel au modèle, réponse en texte libre unique.
   *
   * @throws DashboardAdviceUnavailableError si aucune clé n'est configurée ou si le service est injoignable.
   * @throws DashboardAdviceAccessDeniedError si le service refuse l'authentification.
   * @throws DashboardAdviceInvalidOutputError si la réponse est tronquée, vide ou non textuelle.
   */
  async generate(
    input: DashboardAdviceData,
  ): Promise<GeneratedDashboardAdvice> {
    if (!this.client) {
      throw new DashboardAdviceUnavailableError();
    }
    const startedAt = Date.now();
    const reply = await this.request(this.client, input, startedAt);
    if (reply.stop_reason !== 'end_turn') {
      throw new DashboardAdviceInvalidOutputError('réponse tronquée');
    }
    const [block, ...rest] = reply.content;
    if (
      rest.length > 0 ||
      block?.type !== 'text' ||
      typeof block.text !== 'string'
    ) {
      throw new DashboardAdviceInvalidOutputError('bloc de réponse inattendu');
    }
    this.logger.log(
      `Conseil tableau de bord généré (prompt ${DASHBOARD_ADVICE_PROMPT_VERSION}, modèle ${this.config.model}, ${Date.now() - startedAt} ms)`,
    );
    return { text: block.text, model: this.config.model };
  }

  private async request(
    client: Anthropic,
    input: DashboardAdviceData,
    startedAt: number,
  ): Promise<DashboardAdviceReply> {
    try {
      return await client.messages.create({
        model: this.config.model,
        max_tokens: this.config.maxTokens,
        system: buildDashboardAdviceSystemPrompt(),
        messages: [
          { role: 'user', content: buildDashboardAdviceUserPrompt(input) },
        ],
      });
    } catch (error) {
      const requestId = error instanceof APIError ? error.requestID : undefined;
      this.logger.warn(
        `Échec de l'appel au modèle (prompt ${DASHBOARD_ADVICE_PROMPT_VERSION}, modèle ${this.config.model}, ${Date.now() - startedAt} ms, requestID ${requestId ?? 'absent'})`,
      );
      if (
        error instanceof AuthenticationError ||
        error instanceof PermissionDeniedError
      ) {
        throw new DashboardAdviceAccessDeniedError();
      }
      if (error instanceof AnthropicError) {
        throw new DashboardAdviceUnavailableError();
      }
      throw error;
    }
  }
}
