-- CreateTable
CREATE TABLE "disciplines" (
    "id" UUID NOT NULL,
    "type_key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "first_seen_at" TIMESTAMPTZ(3) NOT NULL,
    "last_seen_at" TIMESTAMPTZ(3) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "disciplines_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "disciplines_type_key_key" ON "disciplines"("type_key");

-- Backfill : une discipline par type d'activité déjà synchronisé
INSERT INTO "disciplines" ("id", "type_key", "label", "first_seen_at", "last_seen_at", "updated_at")
SELECT gen_random_uuid(), "type_key", "type_key", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM (
    SELECT DISTINCT regexp_replace("type", '^\s+|\s+$', '', 'g') AS "type_key"
    FROM "activities"
) AS "keys"
WHERE "type_key" <> '';
