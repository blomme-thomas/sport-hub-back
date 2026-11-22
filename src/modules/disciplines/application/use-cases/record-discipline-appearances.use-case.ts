import { Inject, Injectable } from '@nestjs/common';
import { Discipline } from '../../domain/entities/discipline.entity.js';
import { InvalidDisciplineError } from '../../domain/errors/invalid-discipline.error.js';
import {
  DISCIPLINE_REPOSITORY,
  type IDisciplineRepository,
} from '../../domain/ports/outbound/discipline.repository.port.js';
import {
  DISCIPLINES_CLOCK,
  type DisciplinesClock,
} from '../../domain/ports/outbound/disciplines-clock.port.js';
import { DisciplineTypeKey } from '../../domain/value-objects/discipline-type-key.vo.js';

@Injectable()
export class RecordDisciplineAppearancesUseCase {
  constructor(
    @Inject(DISCIPLINE_REPOSITORY)
    private readonly disciplines: IDisciplineRepository,
    @Inject(DISCIPLINES_CLOCK)
    private readonly now: DisciplinesClock,
  ) {}

  /**
   * Enregistre l'apparition des clés de type : une clé inconnue crée la discipline (libellé provisoire = clé), une clé connue avance seulement sa dernière apparition.
   * Les doublons et les clés vides sont ignorés sans erreur.
   */
  async execute(typeKeys: string[]): Promise<void> {
    const keys = RecordDisciplineAppearancesUseCase.distinctValidKeys(typeKeys);
    if (keys.length === 0) {
      return;
    }
    const seenAt = this.now();
    const known = await this.disciplines.findByTypeKeys(keys);
    const knownByKey = new Map(
      known.map((discipline) => [discipline.typeKey.toString(), discipline]),
    );
    const appearances = keys.map((key) => {
      const existing = knownByKey.get(key.toString());
      return existing === undefined
        ? Discipline.firstSeen(key, seenAt)
        : existing.markSeen(seenAt);
    });
    await this.disciplines.saveAppearances(appearances);
  }

  private static distinctValidKeys(raw: string[]): DisciplineTypeKey[] {
    const keys = new Map<string, DisciplineTypeKey>();
    for (const value of raw) {
      const key = RecordDisciplineAppearancesUseCase.parseKey(value);
      if (key !== null && !keys.has(key.toString())) {
        keys.set(key.toString(), key);
      }
    }
    return [...keys.values()];
  }

  private static parseKey(value: string): DisciplineTypeKey | null {
    try {
      return DisciplineTypeKey.create(value);
    } catch (error) {
      if (error instanceof InvalidDisciplineError) {
        return null;
      }
      throw error;
    }
  }
}
