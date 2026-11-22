-- CreateTable
CREATE TABLE "session_occurrence_exceptions" (
    "id" UUID NOT NULL,
    "session_id" UUID NOT NULL,
    "occurrence_date" DATE NOT NULL,
    "moved_date" DATE,
    "moved_start_time" VARCHAR(5),
    "cancelled" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "session_occurrence_exceptions_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "session_occurrence_exceptions_moved_start_time_check" CHECK ("moved_start_time" IS NULL OR "moved_start_time" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$')
);

-- CreateIndex
CREATE UNIQUE INDEX "session_occurrence_exceptions_session_id_occurrence_date_key" ON "session_occurrence_exceptions"("session_id", "occurrence_date");

-- AddForeignKey
ALTER TABLE "session_occurrence_exceptions" ADD CONSTRAINT "session_occurrence_exceptions_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
