-- CreateTable
CREATE TABLE "activities" (
    "id" UUID NOT NULL,
    "garmin_activity_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "started_at" TIMESTAMPTZ(3) NOT NULL,
    "duration_seconds" DOUBLE PRECISION NOT NULL,
    "distance_meters" DOUBLE PRECISION,
    "raw_payload" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "activities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "activities_garmin_activity_id_key" ON "activities"("garmin_activity_id");

-- CreateIndex
CREATE INDEX "activities_started_at_idx" ON "activities"("started_at");

-- CreateIndex
CREATE INDEX "activities_type_started_at_idx" ON "activities"("type", "started_at");
