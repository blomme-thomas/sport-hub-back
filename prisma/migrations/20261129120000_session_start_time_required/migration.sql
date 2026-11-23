-- L'heure de début d'une séance devient obligatoire : les séances existantes sans heure
-- reçoivent 08:00 avant le passage de la colonne en NOT NULL. À corriger à la main si besoin.

UPDATE "sessions" SET "start_time" = '08:00' WHERE "start_time" IS NULL;

ALTER TABLE "sessions" ALTER COLUMN "start_time" SET NOT NULL;
