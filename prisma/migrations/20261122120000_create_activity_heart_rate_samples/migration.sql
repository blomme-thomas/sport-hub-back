-- CreateTable
CREATE TABLE "activity_heart_rate_samples" (
    "activity_id" UUID NOT NULL,
    "occurred_at" TIMESTAMPTZ(3) NOT NULL,
    "bpm" INTEGER NOT NULL,

    CONSTRAINT "activity_heart_rate_samples_pkey" PRIMARY KEY ("activity_id","occurred_at"),
    CONSTRAINT "activity_heart_rate_samples_bpm_check" CHECK ("bpm" BETWEEN 1 AND 255)
);

-- AddForeignKey
ALTER TABLE "activity_heart_rate_samples" ADD CONSTRAINT "activity_heart_rate_samples_activity_id_fkey" FOREIGN KEY ("activity_id") REFERENCES "activities"("id") ON DELETE CASCADE ON UPDATE CASCADE;
