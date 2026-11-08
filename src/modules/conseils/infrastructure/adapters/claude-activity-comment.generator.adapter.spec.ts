import {
  AnthropicError,
  AuthenticationError,
  type Anthropic,
} from '@anthropic-ai/sdk';
import { describe, expect, it, vi } from 'vitest';
import type { AnthropicConfig } from '../../../../core/config/anthropic/anthropic.config.js';
import { ActivityCommentAccessDeniedError } from '../../domain/errors/activity-comment-access-denied.error.js';
import { ActivityCommentInvalidOutputError } from '../../domain/errors/activity-comment-invalid-output.error.js';
import { ActivityCommentUnavailableError } from '../../domain/errors/activity-comment-unavailable.error.js';
import type { CommentGenerationInput } from '../../domain/ports/outbound/conseils.ports.js';
import { ClaudeActivityCommentGeneratorAdapter } from './claude-activity-comment.generator.adapter.js';

const CONFIG: AnthropicConfig = {
  apiKey: 'sk-ant-test',
  model: 'claude-sonnet-5-5',
  maxTokens: 512,
  timeoutMs: 30000,
  maxRetries: 2,
};

const INPUT: CommentGenerationInput = {
  activity: {
    id: 'a1',
    type: 'running',
    startedAt: new Date('2026-11-12T08:00:00.000Z'),
    durationSeconds: 2700,
    distanceMeters: 8000,
  },
  planned: {
    date: '2026-11-12',
    disciplineTypeKey: 'running',
    durationMinutes: 45,
    status: 'realisee',
  },
};

function adapter(client: unknown): ClaudeActivityCommentGeneratorAdapter {
  return new ClaudeActivityCommentGeneratorAdapter(
    client as Anthropic | null,
    CONFIG,
  );
}

describe('ClaudeActivityCommentGeneratorAdapter', () => {
  it('renvoie le texte après un seul appel au modèle', async () => {
    const create = vi.fn().mockResolvedValue({
      stop_reason: 'end_turn',
      content: [{ type: 'text', text: 'Très bonne sortie, dans les temps.' }],
    });

    const result = await adapter({ messages: { create } }).generate(INPUT);

    expect(create).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      text: 'Très bonne sortie, dans les temps.',
      model: 'claude-sonnet-5-5',
    });
  });

  it('n’envoie au modèle ni identifiant Garmin ni donnée brute', async () => {
    const create = vi.fn().mockResolvedValue({
      stop_reason: 'end_turn',
      content: [{ type: 'text', text: 'Bien.' }],
    });

    await adapter({ messages: { create } }).generate(INPUT);

    const payload = JSON.stringify(create.mock.calls[0][0]);
    expect(payload).not.toContain('rawPayload');
    expect(payload).not.toContain('garminActivityId');
    expect(payload).toContain('running');
  });

  it('refuse sans appel quand aucune clé n’est configurée', async () => {
    await expect(adapter(null).generate(INPUT)).rejects.toBeInstanceOf(
      ActivityCommentUnavailableError,
    );
  });

  it('traduit un refus d’authentification en accès refusé', async () => {
    const create = vi
      .fn()
      .mockRejectedValue(
        new AuthenticationError(401, undefined, 'clé invalide', new Headers()),
      );

    await expect(
      adapter({ messages: { create } }).generate(INPUT),
    ).rejects.toBeInstanceOf(ActivityCommentAccessDeniedError);
  });

  it('traduit une erreur du SDK en service indisponible', async () => {
    const create = vi.fn().mockRejectedValue(new AnthropicError('erreur'));

    await expect(
      adapter({ messages: { create } }).generate(INPUT),
    ).rejects.toBeInstanceOf(ActivityCommentUnavailableError);
  });

  it('refuse une réponse tronquée', async () => {
    const create = vi.fn().mockResolvedValue({
      stop_reason: 'max_tokens',
      content: [{ type: 'text', text: 'Très bonne' }],
    });

    await expect(
      adapter({ messages: { create } }).generate(INPUT),
    ).rejects.toBeInstanceOf(ActivityCommentInvalidOutputError);
  });

  it('refuse une réponse sans bloc texte', async () => {
    const create = vi
      .fn()
      .mockResolvedValue({ stop_reason: 'end_turn', content: [] });

    await expect(
      adapter({ messages: { create } }).generate(INPUT),
    ).rejects.toThrow('bloc de réponse inattendu');
  });
});
