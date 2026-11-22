-- AlterTable
ALTER TABLE "activities"
  ADD COLUMN "calories" DOUBLE PRECISION,
  ADD COLUMN "elevation_gain_meters" DOUBLE PRECISION,
  ADD COLUMN "average_heart_rate" DOUBLE PRECISION,
  ADD COLUMN "hr_time_in_zone_1" DOUBLE PRECISION,
  ADD COLUMN "hr_time_in_zone_2" DOUBLE PRECISION,
  ADD COLUMN "hr_time_in_zone_3" DOUBLE PRECISION,
  ADD COLUMN "hr_time_in_zone_4" DOUBLE PRECISION,
  ADD COLUMN "hr_time_in_zone_5" DOUBLE PRECISION;

-- Backfill depuis le payload Garmin brut : seules les valeurs numériques sont reprises, le reste reste NULL.
UPDATE "activities" SET
  "calories" = CASE WHEN jsonb_typeof("raw_payload"->'calories') = 'number' THEN ("raw_payload"->>'calories')::double precision END,
  "elevation_gain_meters" = CASE WHEN jsonb_typeof("raw_payload"->'elevationGain') = 'number' THEN ("raw_payload"->>'elevationGain')::double precision END,
  "average_heart_rate" = CASE WHEN jsonb_typeof("raw_payload"->'averageHR') = 'number' THEN ("raw_payload"->>'averageHR')::double precision END,
  "hr_time_in_zone_1" = CASE WHEN jsonb_typeof("raw_payload"->'hrTimeInZone_1') = 'number' THEN ("raw_payload"->>'hrTimeInZone_1')::double precision END,
  "hr_time_in_zone_2" = CASE WHEN jsonb_typeof("raw_payload"->'hrTimeInZone_2') = 'number' THEN ("raw_payload"->>'hrTimeInZone_2')::double precision END,
  "hr_time_in_zone_3" = CASE WHEN jsonb_typeof("raw_payload"->'hrTimeInZone_3') = 'number' THEN ("raw_payload"->>'hrTimeInZone_3')::double precision END,
  "hr_time_in_zone_4" = CASE WHEN jsonb_typeof("raw_payload"->'hrTimeInZone_4') = 'number' THEN ("raw_payload"->>'hrTimeInZone_4')::double precision END,
  "hr_time_in_zone_5" = CASE WHEN jsonb_typeof("raw_payload"->'hrTimeInZone_5') = 'number' THEN ("raw_payload"->>'hrTimeInZone_5')::double precision END;
