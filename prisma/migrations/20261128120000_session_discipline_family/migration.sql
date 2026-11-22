-- Les séances portent désormais la famille de discipline (running, cycling, swimming),
-- et non plus le type Garmin. Les types de chaque famille suivent sportFamilyOf
-- (src/shared/domain/value-objects/sport-family.vo.ts). Un type hors de ces familles
-- (ex. hiking, badminton) n'est pas converti : il reste en place et doit être corrigé à la main.

UPDATE "sessions"
SET "discipline_type_key" = CASE
  WHEN "discipline_type_key" IN ('running', 'trail_running', 'treadmill_running', 'track_running') THEN 'running'
  WHEN "discipline_type_key" IN ('cycling', 'road_biking', 'indoor_cycling', 'virtual_ride', 'gravel_cycling', 'mountain_biking', 'e_bike_fitness') THEN 'cycling'
  WHEN "discipline_type_key" IN ('swimming', 'lap_swimming', 'open_water_swimming') THEN 'swimming'
  ELSE "discipline_type_key"
END
WHERE "discipline_type_key" IN (
  'running', 'trail_running', 'treadmill_running', 'track_running',
  'cycling', 'road_biking', 'indoor_cycling', 'virtual_ride', 'gravel_cycling', 'mountain_biking', 'e_bike_fitness',
  'swimming', 'lap_swimming', 'open_water_swimming'
);
