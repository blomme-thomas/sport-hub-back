import { InvalidSessionModuleError } from '../errors/invalid-session-module.error.js';

export interface ZoneRange {
  min: number;
  max: number;
}

export interface TargetZonesInput {
  heartRate?: ZoneRange;
  pace?: ZoneRange;
  power?: ZoneRange;
}

const ZONE_KEYS = ['heartRate', 'pace', 'power'] as const;

export class TargetZones {
  private constructor(private readonly zones: TargetZonesInput) {}

  /**
   * Crée les zones cibles d'un module ; seules les zones fournies sont conservées.
   *
   * @throws InvalidSessionModuleError si une zone n'a pas un minimum et un maximum entiers strictement positifs, avec minimum <= maximum.
   */
  static create(input: TargetZonesInput): TargetZones {
    const zones: TargetZonesInput = {};
    for (const key of ZONE_KEYS) {
      const range = input[key];
      if (range === undefined) {
        continue;
      }
      zones[key] = validatedRange(range);
    }
    return new TargetZones(zones);
  }

  toPrimitives(): TargetZonesInput {
    const primitives: TargetZonesInput = {};
    for (const key of ZONE_KEYS) {
      const range = this.zones[key];
      if (range !== undefined) {
        primitives[key] = { min: range.min, max: range.max };
      }
    }
    return primitives;
  }
}

function validatedRange(range: ZoneRange): ZoneRange {
  if (typeof range !== 'object' || range === null) {
    throw new InvalidSessionModuleError(
      'une zone cible doit avoir un minimum et un maximum',
    );
  }
  const { min, max } = range;
  if (!isPositiveInteger(min) || !isPositiveInteger(max)) {
    throw new InvalidSessionModuleError(
      'les bornes d’une zone cible doivent être des entiers strictement positifs',
    );
  }
  if (min > max) {
    throw new InvalidSessionModuleError(
      'le minimum d’une zone cible ne peut pas dépasser son maximum',
    );
  }
  return { min, max };
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0;
}
