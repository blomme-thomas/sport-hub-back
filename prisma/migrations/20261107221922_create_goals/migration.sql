-- CreateTable
CREATE TABLE "goals" (
    "id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "target_date" DATE,
    "event_format" TEXT,
    "target_time_seconds" INTEGER,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "goals_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "goals_target_time_check" CHECK ("target_time_seconds" IS NULL OR "target_time_seconds" > 0),
    CONSTRAINT "goals_event_fields_check" CHECK ("type" = 'evenement' OR ("event_format" IS NULL AND "target_time_seconds" IS NULL))
);

-- CreateIndex
CREATE INDEX "goals_target_date_idx" ON "goals"("target_date");
