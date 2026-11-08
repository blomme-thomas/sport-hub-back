import { InvalidSessionModuleError } from '../errors/invalid-session-module.error.js';
import { SessionModule } from './session-module.vo.js';

const INSTRUCTION_MAX_LENGTH = 2000;
const DURATION_MAX = 1440;

function captureError(action: () => unknown): unknown {
  try {
    action();
  } catch (error) {
    return error;
  }
  throw new Error('aucune erreur levée');
}

function props(overrides: Record<string, unknown> = {}) {
  return {
    position: 1,
    type: 'series',
    durationMinutes: 20,
    instruction: '4 x 100 m',
    targetZones: null,
    perceivedEffort: null,
    ...overrides,
  };
}

describe('SessionModule', () => {
  describe('création', () => {
    it('expose les valeurs fournies', () => {
      const module = SessionModule.create(
        props({
          position: 3,
          type: 'educatifs',
          durationMinutes: 15,
          instruction: 'Battements jambes',
          targetZones: { heartRate: { min: 120, max: 140 } },
          perceivedEffort: 4,
        }),
      );

      expect(module.position).toBe(3);
      expect(module.type).toBe('educatifs');
      expect(module.durationMinutes).toBe(15);
      expect(module.instruction).toBe('Battements jambes');
      expect(module.targetZones?.toPrimitives()).toEqual({
        heartRate: { min: 120, max: 140 },
      });
      expect(module.perceivedEffort?.value()).toBe(4);
    });

    it('accepte un module sans zones cibles ni effort perçu', () => {
      const module = SessionModule.create(props());

      expect(module.targetZones).toBeNull();
      expect(module.perceivedEffort).toBeNull();
    });

    it('retire les espaces en début et en fin de consigne', () => {
      expect(
        SessionModule.create(props({ instruction: '  4 x 100 m  ' }))
          .instruction,
      ).toBe('4 x 100 m');
    });

    it('accepte une consigne de la longueur maximale', () => {
      const instruction = 'a'.repeat(INSTRUCTION_MAX_LENGTH);

      expect(SessionModule.create(props({ instruction })).instruction).toBe(
        instruction,
      );
    });

    it.each([1, DURATION_MAX])(
      'accepte une durée de %s minute(s)',
      (minutes) => {
        expect(
          SessionModule.create(props({ durationMinutes: minutes }))
            .durationMinutes,
        ).toBe(minutes);
      },
    );

    it('accepte la position 1', () => {
      expect(SessionModule.create(props({ position: 1 })).position).toBe(1);
    });
  });

  describe('refus', () => {
    it.each([
      ['position zéro', { position: 0 }],
      ['position fractionnaire', { position: 1.5 }],
      ['position négative', { position: -2 }],
    ])('refuse %s avec SESSION_MODULE_INVALID', (_label, overrides) => {
      const error = captureError(() => SessionModule.create(props(overrides)));

      expect(error).toBeInstanceOf(InvalidSessionModuleError);
      expect(error).toMatchObject({ code: 'SESSION_MODULE_INVALID' });
    });

    it.each([
      ['type hors valeurs', { type: 'natation' }],
      ['type vide', { type: '' }],
    ])('refuse un %s avec SESSION_MODULE_INVALID', (_label, overrides) => {
      expect(() => SessionModule.create(props(overrides))).toThrow(
        InvalidSessionModuleError,
      );
    });

    it.each([
      ['durée nulle', 0],
      ['durée au-delà de 1440 minutes', DURATION_MAX + 1],
      ['durée fractionnaire', 12.5],
      ['durée NaN', Number.NaN],
    ])('refuse %s avec SESSION_MODULE_INVALID', (_label, durationMinutes) => {
      expect(() => SessionModule.create(props({ durationMinutes }))).toThrow(
        InvalidSessionModuleError,
      );
    });

    it.each([
      ['consigne vide', ''],
      ['consigne composée d’espaces', '   '],
      [
        `consigne de plus de ${INSTRUCTION_MAX_LENGTH} caractères`,
        'a'.repeat(INSTRUCTION_MAX_LENGTH + 1),
      ],
    ])('refuse une %s avec SESSION_MODULE_INVALID', (_label, instruction) => {
      expect(() => SessionModule.create(props({ instruction }))).toThrow(
        InvalidSessionModuleError,
      );
    });

    it.each([
      ['effort perçu nul', 0],
      ['effort perçu au-delà de 10', 11],
    ])('refuse un %s', (_label, perceivedEffort) => {
      expect(() => SessionModule.create(props({ perceivedEffort }))).toThrow(
        InvalidSessionModuleError,
      );
    });

    it('refuse une zone cible invalide', () => {
      expect(() =>
        SessionModule.create(
          props({ targetZones: { heartRate: { min: 160, max: 140 } } }),
        ),
      ).toThrow(InvalidSessionModuleError);
    });
  });
});
