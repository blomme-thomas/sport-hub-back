-- CreateTable
CREATE TABLE "slots" (
    "id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "start_minute" INTEGER NOT NULL,
    "end_minute" INTEGER NOT NULL,
    "recurrence" TEXT NOT NULL DEFAULT 'aucune',
    "time_zone" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "slots_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "slots_minutes_check" CHECK ("start_minute" >= 0 AND "end_minute" <= 1439 AND "end_minute" > "start_minute")
);

-- CreateIndex
CREATE INDEX "slots_date_idx" ON "slots"("date");

-- CreateIndex
CREATE INDEX "slots_recurrence_date_idx" ON "slots"("recurrence", "date");
