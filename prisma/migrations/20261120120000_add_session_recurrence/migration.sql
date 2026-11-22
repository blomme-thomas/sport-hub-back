-- AlterTable
ALTER TABLE "sessions" ADD COLUMN "recurrence" VARCHAR(20) NOT NULL DEFAULT 'aucune';

-- AddCheckConstraint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_recurrence_check" CHECK ("recurrence" IN ('aucune', 'hebdomadaire'));
