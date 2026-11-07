import { GeneratedWorkout } from '../../domain/entities/generated-workout.entity.js';
import { InvalidGeneratedWorkoutError } from '../../domain/errors/invalid-generated-workout.error.js';
import { ClaudeWorkoutGeneratorExternalMapper } from './claude-workout-generator.external-mapper.js';

const VALID_PAYLOAD = {
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

function reply(
  text: string,
  stopReason: string | null = 'end_turn',
): {
  stop_reason: string | null;
  content: Array<{ type: string; text?: string }>;
} {
  return { stop_reason: stopReason, content: [{ type: 'text', text }] };
}

function jsonReply(
  payload: Record<string, unknown>,
  stopReason: string | null = 'end_turn',
) {
  return reply(JSON.stringify(payload), stopReason);
}

function without(
  source: Record<string, unknown>,
  key: string,
): Record<string, unknown> {
  const copy = { ...source };
  delete copy[key];
  return copy;
}

function withStep(
  index: number,
  overrides: Record<string, unknown>,
): Record<string, unknown> {
  const steps = VALID_PAYLOAD.steps.map((step, i) =>
    i === index ? { ...step, ...overrides } : step,
  );
  return { ...VALID_PAYLOAD, steps };
}

describe('ClaudeWorkoutGeneratorExternalMapper', () => {
  describe('réponse valide', () => {
    it('traduit la sortie du modèle en GeneratedWorkout du Domain', () => {
      const workout = ClaudeWorkoutGeneratorExternalMapper.toDomain(
        jsonReply(VALID_PAYLOAD),
      );

      expect(workout).toBeInstanceOf(GeneratedWorkout);
      expect(workout.title).toBe('Fractionné court');
      expect(workout.sport).toBe('running');
      expect(workout.totalDurationMinutes).toBe(45);
      expect(workout.steps.map((s) => s.label)).toEqual([
        'Échauffement',
        'Fractions 6 x 1 min',
        'Retour au calme',
      ]);
    });

    it('accepte une étape sans notes', () => {
      const workout = ClaudeWorkoutGeneratorExternalMapper.toDomain(
        jsonReply(VALID_PAYLOAD),
      );

      expect(workout.steps[0]?.notes).toBeNull();
      expect(workout.steps[1]?.notes).toBe(
        'Récupération active entre les fractions',
      );
    });

    it('accepte une séance de 5 minutes et une séance de 300 minutes', () => {
      const short = ClaudeWorkoutGeneratorExternalMapper.toDomain(
        jsonReply({
          ...VALID_PAYLOAD,
          totalDurationMinutes: 5,
          steps: [
            {
              order: 1,
              label: 'Marche',
              durationMinutes: 5,
              intensity: 'easy',
            },
          ],
        }),
      );
      const long = ClaudeWorkoutGeneratorExternalMapper.toDomain(
        jsonReply({
          ...VALID_PAYLOAD,
          totalDurationMinutes: 300,
          steps: [
            {
              order: 1,
              label: 'Sortie longue',
              durationMinutes: 300,
              intensity: 'easy',
            },
          ],
        }),
      );

      expect(short.totalDurationMinutes).toBe(5);
      expect(long.totalDurationMinutes).toBe(300);
    });
  });

  describe('stop_reason', () => {
    it.each([
      ['max_tokens', 'max_tokens'],
      ['refus du modèle', 'refusal'],
      ['séquence d arrêt', 'stop_sequence'],
      ['appel d outil', 'tool_use'],
      ['absent', null],
    ])('refuse une sortie terminée par %s', (_label, stopReason) => {
      expect(() =>
        ClaudeWorkoutGeneratorExternalMapper.toDomain(
          jsonReply(VALID_PAYLOAD, stopReason),
        ),
      ).toThrow(InvalidGeneratedWorkoutError);
    });
  });

  describe('bloc de contenu', () => {
    it('refuse une réponse sans bloc de contenu', () => {
      expect(() =>
        ClaudeWorkoutGeneratorExternalMapper.toDomain({
          stop_reason: 'end_turn',
          content: [],
        }),
      ).toThrow(InvalidGeneratedWorkoutError);
    });

    it('refuse un bloc qui n est pas du texte', () => {
      expect(() =>
        ClaudeWorkoutGeneratorExternalMapper.toDomain({
          stop_reason: 'end_turn',
          content: [{ type: 'tool_use' }],
        }),
      ).toThrow(InvalidGeneratedWorkoutError);
    });

    it('refuse une réponse mêlant du texte et un bloc qui n est pas du texte', () => {
      expect(() =>
        ClaudeWorkoutGeneratorExternalMapper.toDomain({
          stop_reason: 'end_turn',
          content: [
            { type: 'thinking' },
            { type: 'text', text: JSON.stringify(VALID_PAYLOAD) },
          ],
        }),
      ).toThrow(InvalidGeneratedWorkoutError);
    });
  });

  describe('JSON', () => {
    it.each([
      ['texte libre', 'voici ta séance'],
      ['tableau', '[]'],
      ['null', 'null'],
      ['nombre', '42'],
      ['chaîne vide', ''],
    ])('refuse une sortie qui n est pas un objet JSON (%s)', (_label, text) => {
      expect(() =>
        ClaudeWorkoutGeneratorExternalMapper.toDomain(reply(text)),
      ).toThrow(InvalidGeneratedWorkoutError);
    });

    it('ne recopie pas la sortie brute du modèle dans le message d erreur', () => {
      const error = (() => {
        try {
          ClaudeWorkoutGeneratorExternalMapper.toDomain(
            reply('texte-confidentiel-du-modele'),
          );
        } catch (e) {
          return e as Error;
        }
        return undefined;
      })();

      expect(error).toBeInstanceOf(InvalidGeneratedWorkoutError);
      expect(error?.message).not.toContain('texte-confidentiel-du-modele');
    });
  });

  describe('champs manquants', () => {
    it.each(['title', 'sport', 'summary', 'totalDurationMinutes', 'steps'])(
      'refuse une séance sans %s',
      (key) => {
        expect(() =>
          ClaudeWorkoutGeneratorExternalMapper.toDomain(
            jsonReply(without(VALID_PAYLOAD, key)),
          ),
        ).toThrow(InvalidGeneratedWorkoutError);
      },
    );

    it.each(['order', 'label', 'durationMinutes', 'intensity'])(
      'refuse une étape sans %s',
      (key) => {
        const steps = VALID_PAYLOAD.steps.map((step, i) =>
          i === 0 ? without(step, key) : step,
        );

        expect(() =>
          ClaudeWorkoutGeneratorExternalMapper.toDomain(
            jsonReply({ ...VALID_PAYLOAD, steps }),
          ),
        ).toThrow(InvalidGeneratedWorkoutError);
      },
    );
  });

  describe('types et invariants', () => {
    it.each([
      ['durée de séance en texte', { totalDurationMinutes: '45' }],
      ['durée de séance décimale', { totalDurationMinutes: 45.5 }],
      ['titre vide', { title: '  ' }],
      ['étapes vides', { steps: [], totalDurationMinutes: 0 }],
      ['durée totale incohérente', { totalDurationMinutes: 60 }],
      [
        'durée totale sous la borne',
        {
          totalDurationMinutes: 4,
          steps: [
            {
              order: 1,
              label: 'Marche',
              durationMinutes: 4,
              intensity: 'easy',
            },
          ],
        },
      ],
      [
        'durée totale au-dessus de la borne',
        {
          totalDurationMinutes: 301,
          steps: [
            {
              order: 1,
              label: 'Sortie longue',
              durationMinutes: 301,
              intensity: 'easy',
            },
          ],
        },
      ],
      ['étape en intensité inconnue', withStep(0, { intensity: 'max' })],
      ['étape de durée en texte', withStep(0, { durationMinutes: '10' })],
      ['étape de durée nulle', withStep(0, { durationMinutes: 0 })],
      ['étape de libellé vide', withStep(0, { label: '' })],
      ['étape d ordre nul', withStep(0, { order: 0 })],
      ['ordre des étapes avec un trou', withStep(1, { order: 3 })],
    ])('refuse une séance avec %s', (_label, overrides) => {
      const payload = { ...VALID_PAYLOAD, ...overrides };

      expect(() =>
        ClaudeWorkoutGeneratorExternalMapper.toDomain(jsonReply(payload)),
      ).toThrow(InvalidGeneratedWorkoutError);
    });

    it('porte le code WORKOUT_GENERATION_INVALID_OUTPUT', () => {
      try {
        ClaudeWorkoutGeneratorExternalMapper.toDomain(
          jsonReply({ ...VALID_PAYLOAD, title: '' }),
        );
        expect.unreachable();
      } catch (error) {
        expect((error as InvalidGeneratedWorkoutError).code).toBe(
          'WORKOUT_GENERATION_INVALID_OUTPUT',
        );
      }
    });
  });
});
