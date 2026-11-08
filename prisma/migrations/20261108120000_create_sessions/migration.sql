-- CreateTable
CREATE TABLE "sessions" (
    "id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "discipline_type_key" TEXT NOT NULL,
    "duration_minutes" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'planifiee',
    "modified_manually" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT,
    "equipment" TEXT,
    "attention_points" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "sessions_status_check" CHECK ("status" IN ('planifiee', 'realisee', 'manquee')),
    CONSTRAINT "sessions_duration_minutes_check" CHECK ("duration_minutes" > 0)
);

-- CreateTable
CREATE TABLE "session_modules" (
    "id" UUID NOT NULL,
    "session_id" UUID NOT NULL,
    "position" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "duration_minutes" INTEGER NOT NULL,
    "instruction" TEXT NOT NULL,
    "target_zones" JSONB,
    "perceived_effort" INTEGER,

    CONSTRAINT "session_modules_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "session_modules_position_check" CHECK ("position" >= 1),
    CONSTRAINT "session_modules_duration_minutes_check" CHECK ("duration_minutes" > 0),
    CONSTRAINT "session_modules_perceived_effort_check" CHECK ("perceived_effort" IS NULL OR "perceived_effort" BETWEEN 1 AND 10),
    CONSTRAINT "session_modules_target_zones_check" CHECK ("target_zones" IS NULL OR jsonb_typeof("target_zones") = 'object')
);

-- CreateTable
CREATE TABLE "session_change_logs" (
    "id" UUID NOT NULL,
    "session_id" UUID NOT NULL,
    "changed_at" TIMESTAMPTZ(3) NOT NULL,
    "field" TEXT NOT NULL,
    "previous_value" TEXT,

    CONSTRAINT "session_change_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "sessions_date_idx" ON "sessions"("date");

-- CreateIndex
CREATE INDEX "sessions_status_date_idx" ON "sessions"("status", "date");

-- CreateIndex
CREATE UNIQUE INDEX "session_modules_session_id_position_key" ON "session_modules"("session_id", "position");

-- CreateIndex
CREATE INDEX "session_change_logs_session_id_changed_at_idx" ON "session_change_logs"("session_id", "changed_at");

-- AddForeignKey
ALTER TABLE "session_modules" ADD CONSTRAINT "session_modules_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_change_logs" ADD CONSTRAINT "session_change_logs_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
