import { AuthenticationError, type Anthropic } from '@anthropic-ai/sdk';
import { DashboardAdviceAccessDeniedError } from '../../domain/errors/dashboard-advice-access-denied.error.js';
import { DashboardAdviceInvalidOutputError } from '../../domain/errors/dashboard-advice-invalid-output.error.js';
import { DashboardAdviceUnavailableError } from '../../domain/errors/dashboard-advice-unavailable.error.js';
import type { DashboardAdviceData } from '../../domain/ports/outbound/dashboard-advice.ports.js';
import { ClaudeDashboardAdviceGeneratorAdapter } from './claude-dashboard-advice.generator.adapter.js';

const CONFIG = { model: 'claude-sonnet-5-5', maxTokens: 300 };

const INPUT = {
  week: '2026-W45',
  stats: {
    count: 2,
    durationSeconds: 7200,
    calories: 900,
    elevationGainMeters: null,
    averageHeartRate: 148,
    hrTimeInZoneSeconds: [600, null, null, null, null],
    bySport: [{ type: 'running', count: 2, durationSeconds: 7200 }],
    variationDirection: 'up',
    variationPercent: 12.5,
  },
  recovery: [],
  zones: {
    available: false,
    trainingMethod: null,
    maxHeartRateUsed: null,
    restingHeartRateUsed: null,
    zoneFloors: [null, null, null, null, null],
  },
} as DashboardAdviceData;

function clientReplying(reply: unknown): {
  client: Anthropic;
  create: ReturnType<typeof vi.fn>;
} {
  const create = vi.fn(() => Promise.resolve(reply));
  return { client: { messages: { create } } as unknown as Anthropic, create };
}

const TEXT_REPLY = {
  stop_reason: 'end_turn',
  content: [{ type: 'text', text: 'Belle semaine, garde la séance facile.' }],
};

describe('ClaudeDashboardAdviceGeneratorAdapter', () => {
  it('renvoie le texte et le modèle en un seul appel', async () => {
    const { client, create } = clientReplying(TEXT_REPLY);
    const adapter = new ClaudeDashboardAdviceGeneratorAdapter(client, CONFIG);

    await expect(adapter.generate(INPUT)).resolves.toEqual({
      text: 'Belle semaine, garde la séance facile.',
      model: 'claude-sonnet-5-5',
    });
    expect(create).toHaveBeenCalledTimes(1);
  });

  it("n'appelle pas le modèle sans client et lève une indisponibilité", async () => {
    const adapter = new ClaudeDashboardAdviceGeneratorAdapter(null, CONFIG);

    await expect(adapter.generate(INPUT)).rejects.toBeInstanceOf(
      DashboardAdviceUnavailableError,
    );
  });

  it('refuse une réponse tronquée', async () => {
    const { client } = clientReplying({
      ...TEXT_REPLY,
      stop_reason: 'max_tokens',
    });
    const adapter = new ClaudeDashboardAdviceGeneratorAdapter(client, CONFIG);

    await expect(adapter.generate(INPUT)).rejects.toBeInstanceOf(
      DashboardAdviceInvalidOutputError,
    );
  });

  it('refuse une réponse sans bloc texte', async () => {
    const { client } = clientReplying({
      stop_reason: 'end_turn',
      content: [{ type: 'tool_use' }],
    });
    const adapter = new ClaudeDashboardAdviceGeneratorAdapter(client, CONFIG);

    await expect(adapter.generate(INPUT)).rejects.toBeInstanceOf(
      DashboardAdviceInvalidOutputError,
    );
  });

  it("traduit un refus d'authentification", async () => {
    const create = vi.fn(() =>
      Promise.reject(
        new AuthenticationError(401, undefined, 'refus', new Headers()),
      ),
    );
    const adapter = new ClaudeDashboardAdviceGeneratorAdapter(
      { messages: { create } } as unknown as Anthropic,
      CONFIG,
    );

    await expect(adapter.generate(INPUT)).rejects.toBeInstanceOf(
      DashboardAdviceAccessDeniedError,
    );
  });
});
