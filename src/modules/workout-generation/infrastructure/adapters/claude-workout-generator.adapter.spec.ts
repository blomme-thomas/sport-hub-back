import { Logger } from '@nestjs/common';
import {
  AnthropicError,
  APIConnectionError,
  APIConnectionTimeoutError,
  AuthenticationError,
  InternalServerError,
  PermissionDeniedError,
  RateLimitError,
  RequestTimeoutError,
  type Anthropic,
} from '@anthropic-ai/sdk';
import type { AnthropicConfig } from '../../../../core/config/anthropic/anthropic.config.js';
import { GeneratedWorkout } from '../../domain/entities/generated-workout.entity.js';
import { InvalidGeneratedWorkoutError } from '../../domain/errors/invalid-generated-workout.error.js';
import { WorkoutGenerationAccessDeniedError } from '../../domain/errors/workout-generation-access-denied.error.js';
import { WorkoutGenerationUnavailableError } from '../../domain/errors/workout-generation-unavailable.error.js';
import type { GenerateWorkoutInput } from '../../domain/ports/outbound/workout-ai-generator.port.js';
import { ClaudeWorkoutGeneratorAdapter } from './claude-workout-generator.adapter.js';

const API_KEY = 'sk-ant-cle-secrete-123';
const GOAL = 'préparer un 10 km en juin';

const CONFIG: AnthropicConfig = {
  apiKey: API_KEY,
  model: 'claude-sonnet-5-5',
  maxTokens: 2048,
  timeoutMs: 30000,
  maxRetries: 2,
};

const INPUT: GenerateWorkoutInput = {
  sport: 'course à pied',
  goal: GOAL,
  durationMinutes: 45,
  context: {
    weeks: [
      {
        start: new Date('2026-10-26T00:00:00.000Z'),
        end: new Date('2026-11-01T23:59:59.999Z'),
        activityCount: 3,
        durationSeconds: 5400,
        distanceMeters: 15432,
        byType: [
          {
            type: 'running',
            activityCount: 3,
            durationSeconds: 5400,
            distanceMeters: 15432,
          },
        ],
      },
    ],
  },
};

const WORKOUT_PAYLOAD = {
  title: 'Fractionné court',
  sport: 'running',
  summary: 'Échauffement, fractions, retour au calme.',
  totalDurationMinutes: 45,
  steps: [
    { order: 1, label: 'Échauffement', durationMinutes: 10, intensity: 'easy' },
    {
      order: 2,
      label: 'Fractions 6 x 1 min',
      durationMinutes: 25,
      intensity: 'hard',
      notes: 'Récupération active entre les fractions',
    },
    {
      order: 3,
      label: 'Retour au calme',
      durationMinutes: 10,
      intensity: 'easy',
    },
  ],
};

function response(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    id: 'msg_test',
    type: 'message',
    role: 'assistant',
    model: 'claude-sonnet-5-5',
    stop_reason: 'end_turn',
    content: [{ type: 'text', text: JSON.stringify(WORKOUT_PAYLOAD) }],
    ...overrides,
  };
}

function textResponse(text: string, stopReason = 'end_turn') {
  return response({
    stop_reason: stopReason,
    content: [{ type: 'text', text }],
  });
}

async function rejection(promise: Promise<unknown>): Promise<unknown> {
  return promise.then(
    () => undefined,
    (e: unknown) => e,
  );
}

describe('ClaudeWorkoutGeneratorAdapter', () => {
  let create: ReturnType<typeof vi.fn>;
  let logged: string[];

  function fakeClient(): Anthropic {
    return { messages: { create } } as unknown as Anthropic;
  }

  function adapter(client: Anthropic | null = fakeClient()) {
    return new ClaudeWorkoutGeneratorAdapter(client, CONFIG);
  }

  beforeEach(() => {
    create = vi.fn().mockResolvedValue(response());
    logged = [];
    for (const level of ['log', 'warn', 'error', 'debug', 'verbose'] as const) {
      vi.spyOn(Logger.prototype, level).mockImplementation(
        (...args: unknown[]) => {
          logged.push(args.map((a) => String(a)).join(' '));
        },
      );
    }
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('séance générée', () => {
    it('renvoie une GeneratedWorkout construite depuis la réponse du modèle', async () => {
      const workout = await adapter().generate(INPUT);

      expect(workout).toBeInstanceOf(GeneratedWorkout);
      expect(workout.title).toBe('Fractionné court');
      expect(workout.totalDurationMinutes).toBe(45);
      expect(workout.steps.map((s) => s.label)).toEqual([
        'Échauffement',
        'Fractions 6 x 1 min',
        'Retour au calme',
      ]);
    });
  });

  describe('appel du modèle', () => {
    it('appelle messages.create une seule fois par génération', async () => {
      await adapter().generate(INPUT);

      expect(create).toHaveBeenCalledTimes(1);
    });

    it('utilise le modèle, la limite de jetons et le format de sortie JSON configurés', async () => {
      await adapter().generate(INPUT);

      expect(create.mock.calls[0]?.[0]).toMatchObject({
        model: 'claude-sonnet-5-5',
        max_tokens: 2048,
        output_config: {
          format: { type: 'json_schema' },
        },
      });
    });

    it("envoie l'objectif et le contexte dans le message utilisateur", async () => {
      await adapter().generate(INPUT);

      const params = create.mock.calls[0]?.[0] as {
        messages: Array<{ role: string; content: string }>;
      };
      const userContent = params.messages.map((m) => m.content).join('\n');
      expect(params.messages[0]?.role).toBe('user');
      expect(userContent).toContain(GOAL);
      expect(userContent).toMatch(/15\s?432|15[.,]4/);
    });

    it("n'envoie pas l'objectif dans le prompt système", async () => {
      await adapter().generate(INPUT);

      const params = create.mock.calls[0]?.[0] as { system: string };
      expect(params.system).not.toContain(GOAL);
    });

    it("n'envoie pas la clé Anthropic dans les paramètres de la requête", async () => {
      await adapter().generate(INPUT);

      expect(JSON.stringify(create.mock.calls[0]?.[0])).not.toContain(API_KEY);
    });
  });

  describe('sans clé configurée', () => {
    it('lève WorkoutGenerationUnavailableError quand aucun client n est disponible', async () => {
      const error = await rejection(adapter(null).generate(INPUT));

      expect(error).toBeInstanceOf(WorkoutGenerationUnavailableError);
      expect((error as WorkoutGenerationUnavailableError).code).toBe(
        'WORKOUT_GENERATION_UNAVAILABLE',
      );
      expect(create).not.toHaveBeenCalled();
    });
  });

  describe('sortie inexploitable', () => {
    it.each([
      [
        'arrêt sur max_tokens',
        textResponse(JSON.stringify(WORKOUT_PAYLOAD), 'max_tokens'),
      ],
      [
        'refus du modèle',
        textResponse(JSON.stringify(WORKOUT_PAYLOAD), 'refusal'),
      ],
      ['texte qui n est pas du JSON', textResponse('voici ta séance')],
      [
        'bloc qui n est pas du texte',
        response({
          content: [{ type: 'tool_use', id: 't1', name: 'x', input: {} }],
        }),
      ],
      ['réponse sans contenu', response({ content: [] })],
      [
        'durée totale incohérente avec les étapes',
        textResponse(
          JSON.stringify({ ...WORKOUT_PAYLOAD, totalDurationMinutes: 99 }),
        ),
      ],
      [
        'champ obligatoire manquant',
        textResponse(
          JSON.stringify({
            sport: WORKOUT_PAYLOAD.sport,
            summary: WORKOUT_PAYLOAD.summary,
            totalDurationMinutes: WORKOUT_PAYLOAD.totalDurationMinutes,
            steps: WORKOUT_PAYLOAD.steps,
          }),
        ),
      ],
    ])(
      'rejette une sortie inexploitable (%s) sans renvoyer de séance partielle',
      async (_label, reply) => {
        create.mockResolvedValue(reply);

        const error = await rejection(adapter().generate(INPUT));

        expect(error).toBeInstanceOf(InvalidGeneratedWorkoutError);
        expect((error as InvalidGeneratedWorkoutError).code).toBe(
          'WORKOUT_GENERATION_INVALID_OUTPUT',
        );
      },
    );
  });

  describe('erreurs techniques', () => {
    it.each([
      [
        'clé refusée',
        () =>
          new AuthenticationError(
            401,
            undefined,
            'SECRET-401 clé invalide',
            new Headers(),
          ),
        WorkoutGenerationAccessDeniedError,
        'WORKOUT_GENERATION_ACCESS_DENIED',
      ],
      [
        'permission refusée',
        () =>
          new PermissionDeniedError(
            403,
            undefined,
            'SECRET-403 interdit',
            new Headers(),
          ),
        WorkoutGenerationAccessDeniedError,
        'WORKOUT_GENERATION_ACCESS_DENIED',
      ],
      [
        'délai de connexion dépassé',
        () => new APIConnectionTimeoutError(),
        WorkoutGenerationUnavailableError,
        'WORKOUT_GENERATION_UNAVAILABLE',
      ],
      [
        'connexion impossible',
        () => new APIConnectionError({ message: 'SECRET-CONNEXION réseau' }),
        WorkoutGenerationUnavailableError,
        'WORKOUT_GENERATION_UNAVAILABLE',
      ],
      [
        'quota atteint',
        () =>
          new RateLimitError(
            429,
            undefined,
            'SECRET-429 trop de requêtes',
            new Headers(),
          ),
        WorkoutGenerationUnavailableError,
        'WORKOUT_GENERATION_UNAVAILABLE',
      ],
      [
        'délai de requête dépassé',
        () =>
          new RequestTimeoutError(
            408,
            undefined,
            'SECRET-408 délai',
            new Headers(),
          ),
        WorkoutGenerationUnavailableError,
        'WORKOUT_GENERATION_UNAVAILABLE',
      ],
      [
        'panne côté Anthropic',
        () =>
          new InternalServerError(
            500,
            undefined,
            'SECRET-500 panne',
            new Headers(),
          ),
        WorkoutGenerationUnavailableError,
        'WORKOUT_GENERATION_UNAVAILABLE',
      ],
      [
        'erreur SDK générique',
        () => new AnthropicError('SECRET-GENERIQUE erreur'),
        WorkoutGenerationUnavailableError,
        'WORKOUT_GENERATION_UNAVAILABLE',
      ],
    ] as const)(
      'traduit %s en erreur du Domain sans détail interne',
      async (_label, build, expected, code) => {
        create.mockRejectedValue(build());

        const error = await rejection(adapter().generate(INPUT));

        expect(error).toBeInstanceOf(expected);
        expect((error as { code: string }).code).toBe(code);
        expect((error as Error).cause).toBeUndefined();
        expect((error as Error).message).not.toContain('SECRET');
        expect(logged.join('\n')).not.toContain('SECRET');
      },
    );
  });

  describe('confidentialité', () => {
    it("ne journalise ni la clé ni l'objectif lors d'une génération réussie", async () => {
      await adapter().generate(INPUT);

      const output = logged.join('\n');
      expect(output).not.toContain(API_KEY);
      expect(output).not.toContain(GOAL);
    });

    it("ne journalise ni la clé ni le prompt lors d'une sortie inexploitable", async () => {
      create.mockResolvedValue(textResponse(`texte ${GOAL} ${API_KEY}`));

      await rejection(adapter().generate(INPUT));

      const output = logged.join('\n');
      expect(output).not.toContain(API_KEY);
      expect(output).not.toContain(GOAL);
    });
  });
});
