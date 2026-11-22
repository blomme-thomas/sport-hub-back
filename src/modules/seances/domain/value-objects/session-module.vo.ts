import { InvalidSessionModuleError } from '../errors/invalid-session-module.error.js';
import { type ModuleType, isModuleType } from './module-type.vo.js';
import { PerceivedEffort } from './perceived-effort.vo.js';
import { TargetZones, type TargetZonesInput } from './target-zones.vo.js';

const DURATION_MAX_MINUTES = 1440;
const INSTRUCTION_MAX_LENGTH = 2000;

export interface SessionModuleProps {
  position: number;
  type: string;
  durationMinutes: number;
  instruction: string;
  targetZones?: TargetZonesInput | null;
  perceivedEffort?: number | null;
}

export interface SessionModulePrimitives {
  position: number;
  type: ModuleType;
  durationMinutes: number;
  instruction: string;
  targetZones: TargetZonesInput | null;
  perceivedEffort: number | null;
}

export class SessionModule {
  private constructor(
    readonly position: number,
    readonly type: ModuleType,
    readonly durationMinutes: number,
    readonly instruction: string,
    readonly targetZones: TargetZones | null,
    readonly perceivedEffort: PerceivedEffort | null,
  ) {}

  /**
   * Crée un module de séance après validation de ses invariants.
   *
   * @throws InvalidSessionModuleError si la position, le type, la durée, la consigne, les zones cibles ou l'effort perçu sont invalides.
   */
  static create(props: SessionModuleProps): SessionModule {
    if (!Number.isInteger(props.position) || props.position < 1) {
      throw new InvalidSessionModuleError(
        'la position doit être un entier positif',
      );
    }
    if (!isModuleType(props.type)) {
      throw new InvalidSessionModuleError(
        'le type doit être echauffement, educatifs, series, retour_au_calme ou autre',
      );
    }
    if (!isDuration(props.durationMinutes)) {
      throw new InvalidSessionModuleError(
        `la durée doit être un nombre entier de minutes de 1 à ${DURATION_MAX_MINUTES}`,
      );
    }
    const instruction = props.instruction.trim();
    if (instruction.length === 0) {
      throw new InvalidSessionModuleError('la consigne ne peut pas être vide');
    }
    if (instruction.length > INSTRUCTION_MAX_LENGTH) {
      throw new InvalidSessionModuleError(
        `la consigne dépasse ${INSTRUCTION_MAX_LENGTH} caractères`,
      );
    }
    return new SessionModule(
      props.position,
      props.type,
      props.durationMinutes,
      instruction,
      props.targetZones === undefined || props.targetZones === null
        ? null
        : TargetZones.create(props.targetZones),
      props.perceivedEffort === undefined || props.perceivedEffort === null
        ? null
        : PerceivedEffort.create(props.perceivedEffort),
    );
  }

  withPosition(position: number): SessionModule {
    return SessionModule.create({ ...this.toPrimitives(), position });
  }

  toPrimitives(): SessionModulePrimitives {
    return {
      position: this.position,
      type: this.type,
      durationMinutes: this.durationMinutes,
      instruction: this.instruction,
      targetZones: this.targetZones?.toPrimitives() ?? null,
      perceivedEffort: this.perceivedEffort?.value() ?? null,
    };
  }
}

function isDuration(value: number): boolean {
  return Number.isInteger(value) && value >= 1 && value <= DURATION_MAX_MINUTES;
}
