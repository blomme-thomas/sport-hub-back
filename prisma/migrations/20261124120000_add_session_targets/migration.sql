-- AlterTable
ALTER TABLE "sessions" ADD COLUMN "target_distance_meters" DOUBLE PRECISION,
ADD COLUMN "target_hr_zone_1" INTEGER,
ADD COLUMN "target_hr_zone_2" INTEGER,
ADD COLUMN "target_hr_zone_3" INTEGER,
ADD COLUMN "target_hr_zone_4" INTEGER,
ADD COLUMN "target_hr_zone_5" INTEGER;
