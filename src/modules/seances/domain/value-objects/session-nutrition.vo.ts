import { InvalidSessionError } from '../errors/invalid-session.error.js';

export const SESSION_CARBS_UNITS = ['par_heure', 'pour_la_seance'] as const;

export type SessionCarbsUnit = (typeof SESSION_CARBS_UNITS)[number];

const CARBS_MAX_GRAMS = 1000;
const HYDRATION_MAX_MILLILITERS = 20000;

export function isSessionCarbsUnit(value: string): value is SessionCarbsUnit {
  return (SESSION_CARBS_UNITS as readonly string[]).includes(value);
}

/** Cible de glucides en grammes entiers de 1 à 1000, toujours accompagnée de son unité ; les deux sont renseignés ou les deux absents. */
export function assertCarbs(
  grams: number | null,
  unit: SessionCarbsUnit | null,
): void {
  if (grams === null && unit === null) {
    return;
  }
  if (grams === null || unit === null) {
    throw new InvalidSessionError(
      'les glucides et leur unité doivent être renseignés ensemble',
    );
  }
  if (!Number.isInteger(grams) || grams < 1 || grams > CARBS_MAX_GRAMS) {
    throw new InvalidSessionError(
      `les glucides doivent être un nombre entier de grammes de 1 à ${CARBS_MAX_GRAMS}`,
    );
  }
  if (!isSessionCarbsUnit(unit)) {
    throw new InvalidSessionError(
      "l'unité des glucides doit être par_heure ou pour_la_seance",
    );
  }
}

/** Hydratation visée pour la séance entière, en millilitres entiers de 1 à 20000. */
export function assertHydration(milliliters: number): void {
  if (
    !Number.isInteger(milliliters) ||
    milliliters < 1 ||
    milliliters > HYDRATION_MAX_MILLILITERS
  ) {
    throw new InvalidSessionError(
      `l'hydratation doit être un nombre entier de millilitres de 1 à ${HYDRATION_MAX_MILLILITERS}`,
    );
  }
}
