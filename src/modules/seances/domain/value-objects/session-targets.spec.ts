import { describe, expect, it } from 'vitest';
import { InvalidSessionError } from '../errors/invalid-session.error.js';
import {
  assertTargetZones,
  assertTargetDistance,
} from './session-targets.vo.js';

describe('objectifs de séance', () => {
  it('accepte une répartition de cinq zones qui totalise 100', () => {
    expect(() => assertTargetZones([10, 20, 40, 20, 10])).not.toThrow();
  });

  it.each([
    ['somme inférieure à 100', [10, 20, 40, 20, 5]],
    ['somme supérieure à 100', [10, 20, 40, 20, 20]],
    ['quatre zones seulement', [25, 25, 25, 25]],
    ['valeur négative', [-10, 60, 20, 20, 10]],
    ['valeur décimale', [10.5, 20, 40, 20, 9.5]],
  ])('refuse une répartition : %s', (_label, zones) => {
    expect(() => assertTargetZones(zones)).toThrow(InvalidSessionError);
  });

  it('accepte une distance visée strictement positive', () => {
    expect(() => assertTargetDistance(10000)).not.toThrow();
  });

  it.each([0, -5])('refuse une distance visée de %s', (value) => {
    expect(() => assertTargetDistance(value)).toThrow(InvalidSessionError);
  });
});
