-- CreateTable
CREATE TABLE "pauses" (
    "id" UUID NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "reason" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "pauses_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "pauses_reason_check" CHECK ("reason" IN ('blessure', 'vacances', 'autre')),
    CONSTRAINT "pauses_dates_check" CHECK ("end_date" >= "start_date")
);

-- CreateIndex
CREATE INDEX "pauses_start_date_end_date_idx" ON "pauses"("start_date", "end_date");
