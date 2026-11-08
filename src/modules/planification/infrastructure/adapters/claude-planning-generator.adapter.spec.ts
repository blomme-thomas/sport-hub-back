import {
  AnthropicError,
  AuthenticationError,
  type Anthropic,
} from '@anthropic-ai/sdk';
import { describe, expect, it, vi } from 'vitest';
import type { AnthropicConfig } from '../../../../core/config/anthropic/anthropic.config.js';
import { PlanningGenerationAccessDeniedError } from '../../domain/errors/planning-generation-access-denied.error.js';
import { PlanningGenerationUnavailableError } from '../../domain/errors/planning-generation-unavailable.error.js';
import { PlanningInvalidOutputError } from '../../domain/errors/planning-invalid-output.error.js';
import type { PlanningGenerationInput } from '../../domain/ports/outbound/planning-ai-generator.port.js';
import { ClaudePlanningGeneratorAdapter } from './claude-planning-generator.adapter.js';

const CONFIG: AnthropicConfig = {
  apiKey: 'sk-ant-test',
  model: 'claude-sonnet-5-5',
  maxTokens: 2048,
  timeoutMs: 30000,
  maxRetries: 2,
};

const INPUT: PlanningGenerationInput = {
  from: '2026-11-10',
  to: '2026-11-15',
  freeSlots: [
    {
      slotId: 'libre-1',
      date: '2026-11-12',
      startTime: '18:00',
      endTime: '20:00',
      availableMinutes: 120,
    },
  ],
  existingSessions: [
    {
      date: '2026-11-13',
      durationMinutes: 60,
      status: 'realisee',
      modifiedManually: false,
      disciplineTypeKey: 'running',
    },
  ],
  disciplines: [{ typeKey: 'swimming', label: 'Natation' }],
  goal: null,
};

const VALID_JSON = JSON.stringify({
  sessions: [
    {
      date: '2026-11-12',
      disciplineTypeKey: 'swimming',
      durationMinutes: 45,
      modules: [
        {
          type: 'echauffement',
          durationMinutes: 10,
          instruction: 'Nage souple',
        },
        {
          type: 'series',
          durationMinutes: 25,
          instruction: '4 x 100 m',
          perceivedEffort: 7,
        },
      ],
    },
  ],
});

function reply(text: string, stopReason = 'end_turn') {
  return { stop_reason: stopReason, content: [{ type: 'text', text }] };
}

function adapter(client: unknown): ClaudePlanningGeneratorAdapter {
  return new ClaudePlanningGeneratorAdapter(client as Anthropic | null, CONFIG);
}

describe('ClaudePlanningGeneratorAdapter', () => {
  it('renvoie les séances proposées après un seul appel au modèle', async () => {
    const create = vi.fn().mockResolvedValue(reply(VALID_JSON));

    const sessions = await adapter({ messages: { create } }).generate(INPUT);

    expect(create).toHaveBeenCalledTimes(1);
    expect(sessions).toEqual([
      {
        date: '2026-11-12',
        disciplineTypeKey: 'swimming',
        durationMinutes: 45,
        modules: [
          {
            type: 'echauffement',
            durationMinutes: 10,
            instruction: 'Nage souple',
            targetZones: null,
            perceivedEffort: null,
          },
          {
            type: 'series',
            durationMinutes: 25,
            instruction: '4 x 100 m',
            targetZones: null,
            perceivedEffort: 7,
          },
        ],
      },
    ]);
  });

  it('n’envoie au modèle que le temps libre, les séances et le référentiel, sans donnée Garmin brute', async () => {
    const create = vi.fn().mockResolvedValue(reply(VALID_JSON));

    await adapter({ messages: { create } }).generate(INPUT);

    const payload = JSON.stringify(create.mock.calls[0][0]);
    expect(payload).not.toContain('rawPayload');
    expect(payload).not.toContain('garminActivityId');
    expect(payload).toContain('availableMinutes');
  });

  it('refuse sans appel quand aucune clé n’est configurée', async () => {
    await expect(adapter(null).generate(INPUT)).rejects.toBeInstanceOf(
      PlanningGenerationUnavailableError,
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
    ).rejects.toBeInstanceOf(PlanningGenerationAccessDeniedError);
  });

  it('traduit une erreur du SDK en service indisponible', async () => {
    const create = vi.fn().mockRejectedValue(new AnthropicError('erreur'));

    await expect(
      adapter({ messages: { create } }).generate(INPUT),
    ).rejects.toBeInstanceOf(PlanningGenerationUnavailableError);
  });

  it('refuse une réponse tronquée', async () => {
    const create = vi.fn().mockResolvedValue(reply(VALID_JSON, 'max_tokens'));

    await expect(
      adapter({ messages: { create } }).generate(INPUT),
    ).rejects.toBeInstanceOf(PlanningInvalidOutputError);
  });

  it('refuse un JSON invalide', async () => {
    const create = vi.fn().mockResolvedValue(reply('pas du json'));

    await expect(
      adapter({ messages: { create } }).generate(INPUT),
    ).rejects.toThrow('JSON invalide');
  });

  it('refuse une réponse hors schéma, par exemple un module de type inconnu', async () => {
    const create = vi.fn().mockResolvedValue(
      reply(
        JSON.stringify({
          sessions: [
            {
              date: '2026-11-12',
              disciplineTypeKey: 'swimming',
              durationMinutes: 45,
              modules: [
                { type: 'inconnu', durationMinutes: 10, instruction: 'x' },
              ],
            },
          ],
        }),
      ),
    );

    await expect(
      adapter({ messages: { create } }).generate(INPUT),
    ).rejects.toThrow('schéma non respecté');
  });
});
