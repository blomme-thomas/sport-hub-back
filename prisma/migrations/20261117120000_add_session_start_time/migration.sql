-- AlterTable
ALTER TABLE "sessions" ADD COLUMN "start_time" VARCHAR(5);

-- AddCheckConstraint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_start_time_check" CHECK ("start_time" IS NULL OR "start_time" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$');
