import type { PlanEnvelopeFormat } from '../../../shared/import/plan-import.js';

/** Format `plan-aliments` : liste d'aliments à créer. Une liste brute est aussi acceptée. */
export const FOOD_IMPORT_FORMAT: PlanEnvelopeFormat = {
  kind: 'plan-aliments',
  listKey: 'aliments',
  supportedVersions: [1],
};

/** Format `plan-recettes` : liste de recettes à créer, items désignés par le nom de leur aliment. */
export const RECIPE_IMPORT_FORMAT: PlanEnvelopeFormat = {
  kind: 'plan-recettes',
  listKey: 'recettes',
  supportedVersions: [1],
};
