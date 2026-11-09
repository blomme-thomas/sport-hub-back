/** Famille de sport affichée dans la répartition : course, vélo, natation, ou tout le reste. */
export const SPORT_FAMILIES = [
  'running',
  'cycling',
  'swimming',
  'other',
] as const;

export type SportFamily = (typeof SPORT_FAMILIES)[number];

const RUNNING_TYPES: readonly string[] = [
  'running',
  'trail_running',
  'treadmill_running',
  'track_running',
];

const CYCLING_TYPES: readonly string[] = [
  'cycling',
  'road_biking',
  'indoor_cycling',
  'virtual_ride',
  'gravel_cycling',
  'mountain_biking',
  'e_bike_fitness',
];

const SWIMMING_TYPES: readonly string[] = [
  'swimming',
  'lap_swimming',
  'open_water_swimming',
];

/** Famille d'un type d'activité Garmin ; tout type non listé (musculation, randonnée, marche…) est « other ». */
export function sportFamilyOf(type: string): SportFamily {
  if (RUNNING_TYPES.includes(type)) return 'running';
  if (CYCLING_TYPES.includes(type)) return 'cycling';
  if (SWIMMING_TYPES.includes(type)) return 'swimming';
  return 'other';
}
