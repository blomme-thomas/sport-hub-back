-- CreateTable
CREATE TABLE "weekly_reviews" (
    "week" VARCHAR(8) NOT NULL,
    "suivi" TEXT NOT NULL,
    "point_attention" TEXT NOT NULL,
    "conseil" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "model" TEXT,
    "generated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "weekly_reviews_pkey" PRIMARY KEY ("week"),
    CONSTRAINT "weekly_reviews_source_check" CHECK ("source" IN ('ia', 'generique')),
    CONSTRAINT "weekly_reviews_week_format_check" CHECK ("week" ~ '^[0-9]{4}-W[0-9]{2}$')
);
