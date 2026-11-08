import type {
  FreeSlotCapacity,
  SessionSnapshot,
} from '../../services/free-slot-capacity.calculator.js';
import type { PlannedSession } from '../../value-objects/planned-session.vo.js';
import type { PlanningDiscipline } from './discipline-referential.port.js';
import type { PlanningGoal } from './goal-provider.port.js';

export interface PlanningGenerationInput {
  from: string;
  to: string;
  freeSlots: readonly FreeSlotCapacity[];
  existingSessions: readonly SessionSnapshot[];
  disciplines: readonly PlanningDiscipline[];
  goal: PlanningGoal | null;
}

/** Contrat vers le modèle de langage : propose les séances d'une période, en un seul appel. */
export interface IPlanningAiGenerator {
  /**
   * Renvoie les séances proposées. Elles ne sont pas encore contrôlées : le use case passe le résultat au validateur du domaine.
   *
   * @throws PlanningGenerationUnavailableError si le service est indisponible.
   * @throws PlanningGenerationAccessDeniedError si le service refuse l'accès.
   * @throws PlanningInvalidOutputError si la réponse n'est pas exploitable.
   */
  generate(input: PlanningGenerationInput): Promise<PlannedSession[]>;
}

export const PLANNING_AI_GENERATOR = Symbol('PLANNING_AI_GENERATOR');
