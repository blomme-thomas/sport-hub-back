import type { Discipline } from '../../entities/discipline.entity.js';
import type { DisciplineTypeKey } from '../../value-objects/discipline-type-key.vo.js';

export interface IDisciplineRepository {
  /** Renvoie toutes les disciplines triées par libellé croissant, puis par clé de type croissante. */
  findAll(): Promise<Discipline[]>;

  /** Renvoie la discipline portant cette clé de type, ou null si elle est inconnue. */
  findByTypeKey(typeKey: DisciplineTypeKey): Promise<Discipline | null>;

  /** Renvoie les disciplines connues parmi les clés fournies. */
  findByTypeKeys(typeKeys: DisciplineTypeKey[]): Promise<Discipline[]>;

  /**
   * Enregistre les apparitions en une transaction : crée les disciplines nouvelles et avance la dernière apparition des connues.
   * N'écrit jamais le libellé, qui reste celui saisi par l'utilisateur.
   */
  saveAppearances(disciplines: Discipline[]): Promise<void>;

  /** Enregistre le seul libellé de la discipline, identifiée par sa clé de type. */
  saveLabel(discipline: Discipline): Promise<void>;
}

export const DISCIPLINE_REPOSITORY = Symbol('DISCIPLINE_REPOSITORY');
