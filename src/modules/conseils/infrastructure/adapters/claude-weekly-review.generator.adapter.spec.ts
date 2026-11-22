import { AuthenticationError } from '@anthropic-ai/sdk';
import { WeeklyReviewAccessDeniedError } from '../../domain/errors/weekly-review-access-denied.error.js';
import { WeeklyReviewInvalidOutputError } from '../../domain/errors/weekly-review-invalid-output.error.js';
import { WeeklyReviewUnavailableError } from '../../domain/errors/weekly-review-unavailable.error.js';
import type { WeeklyReviewInput } from '../../domain/ports/outbound/weekly-review.ports.js';
import { ClaudeWeeklyReviewGeneratorAdapter } from './claude-weekly-review.generator.adapter.js';

const CONFIG = {
  model: 'claude-sonnet-5-5',
  maxTokens: 800,
  timeoutMs: 10000,
  maxRetries: 0,
};

const INPUT: WeeklyReviewInput = {
  week: '2026-W45',
  planned: [
    {
      date: '2026-11-04',
      disciplineTypeKey: 'running',
      durationMinutes: 45,
      status: 'realisee',
    },
  ],
  current: { count: 1, durationSeconds: 2700, distanceMeters: 8000 },
  previous: { count: 0, durationSeconds: 0, distanceMeters: 0 },
};

const VALID_JSON = JSON.stringify({
  suivi: 'Séance réalisée.',
  pointAttention: 'Allure à surveiller.',
  conseil: 'Repos actif mercredi.',
});

function reply(text: string, stopReason = 'end_turn') {
  return {
    stop_reason: stopReason,
    content: [{ type: 'text', text }],
  };
}

function adapterWith(create: ReturnType<typeof vi.fn>) {
  const client = { messages: { create } };
  return new ClaudeWeeklyReviewGeneratorAdapter(
    client as never,
    CONFIG as never,
  );
}

describe('ClaudeWeeklyReviewGeneratorAdapter', () => {
  it('fait un seul appel et traduit la réponse JSON', async () => {
    const create = vi.fn().mockResolvedValue(reply(VALID_JSON));

    const generated = await adapterWith(create).generate(INPUT);

    expect(create).toHaveBeenCalledTimes(1);
    expect(generated).toEqual({
      suivi: 'Séance réalisée.',
      pointAttention: 'Allure à surveiller.',
      conseil: 'Repos actif mercredi.',
      model: 'claude-sonnet-5-5',
    });
  });

  it('envoie le prévu et les volumes, sans rien d’autre que ces données', async () => {
    const create = vi.fn().mockResolvedValue(reply(VALID_JSON));

    await adapterWith(create).generate(INPUT);

    const payload = create.mock.calls[0]?.[0] as {
      messages: { content: string }[];
    };
    expect(payload.messages[0]?.content).toContain(
      '"disciplineTypeKey":"running"',
    );
    expect(payload.messages[0]?.content).toContain('"volumeSemaine"');
  });

  it('lève WeeklyReviewUnavailableError sans clé configurée', async () => {
    const adapter = new ClaudeWeeklyReviewGeneratorAdapter(
      null,
      CONFIG as never,
    );

    await expect(adapter.generate(INPUT)).rejects.toBeInstanceOf(
      WeeklyReviewUnavailableError,
    );
  });

  it('lève WeeklyReviewAccessDeniedError si le service refuse l’authentification', async () => {
    const create = vi
      .fn()
      .mockRejectedValue(
        new AuthenticationError(401, undefined, 'refusé', new Headers()),
      );

    await expect(adapterWith(create).generate(INPUT)).rejects.toBeInstanceOf(
      WeeklyReviewAccessDeniedError,
    );
  });

  it('rejette une réponse tronquée', async () => {
    const create = vi.fn().mockResolvedValue(reply(VALID_JSON, 'max_tokens'));

    await expect(adapterWith(create).generate(INPUT)).rejects.toBeInstanceOf(
      WeeklyReviewInvalidOutputError,
    );
  });

  it('rejette une réponse qui n’est pas un JSON au format attendu', async () => {
    const create = vi.fn().mockResolvedValue(reply('Bon bilan !'));

    await expect(adapterWith(create).generate(INPUT)).rejects.toBeInstanceOf(
      WeeklyReviewInvalidOutputError,
    );
  });
});
