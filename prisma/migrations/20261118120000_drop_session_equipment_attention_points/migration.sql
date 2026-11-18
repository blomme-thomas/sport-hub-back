-- Retrait des champs « matériel » et « points d’attention » des séances (aucune donnée saisie à ce jour).
ALTER TABLE "sessions" DROP COLUMN "equipment",
  DROP COLUMN "attention_points";
