-- CreateTable
CREATE TABLE "user_settings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "weekly_target_seconds" INTEGER,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "user_settings_pkey" PRIMARY KEY ("id")
);
