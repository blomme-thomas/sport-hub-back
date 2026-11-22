import { InvalidSessionModuleError } from '../errors/invalid-session-module.error.js';
import { TargetZones, type TargetZonesInput } from './target-zones.vo.js';

function captureError(action: () => unknown): unknown {
  try {
    action();
  } catch (error) {
    return error;
  }
  throw new Error('aucune erreur levée');
}

describe('TargetZones', () => {
  it('restitue les trois zones fournies', () => {
    const zones = TargetZones.create({
      heartRate: { min: 140, max: 160 },
      pace: { min: 300, max: 330 },
      power: { min: 200, max: 250 },
    });

    expect(zones.toPrimitives()).toEqual({
      heartRate: { min: 140, max: 160 },
      pace: { min: 300, max: 330 },
      power: { min: 200, max: 250 },
    });
  });

  it('accepte une seule zone et n’en renvoie qu’une', () => {
    const zones = TargetZones.create({ pace: { min: 300, max: 330 } });

    expect(zones.toPrimitives()).toEqual({ pace: { min: 300, max: 330 } });
  });

  it('accepte une zone réduite à une seule valeur', () => {
    const zones = TargetZones.create({ heartRate: { min: 150, max: 150 } });

    expect(zones.toPrimitives()).toEqual({ heartRate: { min: 150, max: 150 } });
  });

  it.each([
    ['minimum supérieur au maximum', { heartRate: { min: 160, max: 140 } }],
    ['minimum nul', { heartRate: { min: 0, max: 140 } }],
    ['valeur négative', { power: { min: -10, max: 250 } }],
    ['borne fractionnaire', { pace: { min: 300.5, max: 330 } }],
    ['borne NaN', { heartRate: { min: Number.NaN, max: 160 } }],
    ['zone sans maximum', { heartRate: { min: 140 } }],
  ])('refuse une zone avec %s en SESSION_MODULE_INVALID', (_label, input) => {
    const error = captureError(() =>
      TargetZones.create(input as TargetZonesInput),
    );

    expect(error).toBeInstanceOf(InvalidSessionModuleError);
    expect(error).toMatchObject({ code: 'SESSION_MODULE_INVALID' });
  });
});
